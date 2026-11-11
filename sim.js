(function () {
  "use strict";

  /* ------------------------------ outils ------------------------------ */
  const $ = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function prng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // La monnaie est le franc guineen. Les prix internes restent en "unites",
  // l'affichage les convertit : 1 unite = 1 000 GNF.
  const GNF = 1000;
  const fmt = (n) => {
    const v = Math.floor(n * GNF);
    if (v >= 1e9) return (v / 1e9).toFixed(2).replace(".", ",") + " Md GNF";
    const t = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return t + " GNF";
  };

  /* ------------------------------ monde ------------------------------ */
  const N = 40;
  const TW = 64, TH = 32;
  const SAVE = "komara-city";            // cle figee : ne plus jamais la changer
  const SAVE_ANCIENNES = ["komara-city-v2", "komara-city-v1"];

  function typeSol(x, y) {
    if (etat.eau && etat.eau.has(x + "," + y)) return 2;
    if (etat.sable && etat.sable.has(x + "," + y)) return 1;
    const d = x + y;
    if (d >= N + 10) return 2;
    if (d >= N + 6) return 1;
    if (x < 6 && y > N - 12) return (x + (N - y) < 9) ? 2 : 1;
    return 0;
  }

  /* ------------------------------ catalogue ------------------------------ */
  // w,h : gabarit en cases. drapeau : mât au drapeau guinéen.
  const CAT = {
    /* --- infrastructure --- */
    route:      { nom: "Route",        cout: 8,    rev: 0,    w: 1, h: 1, onglet: "route",    niv: 1, type: "route" },
    rail:       { nom: "Chemin de fer",cout: 22,   rev: 0,    w: 1, h: 1, onglet: "route",    niv: 1, type: "rail" },
    trottoir:   { nom: "Trottoir",     cout: 5,    rev: 0,    w: 1, h: 1, onglet: "route",    niv: 1, type: "trottoir" },
    pont:       { nom: "Pont",         cout: 140,  rev: 0,    w: 1, h: 1, onglet: "route",    niv: 1, type: "pont" },
    canal:      { nom: "Canal d'eau",  cout: 30,   rev: 0,    w: 1, h: 1, onglet: "route",    niv: 1, type: "canal" },
    viaduc:     { nom: "Viaduc (route dessous)", cout: 260, rev: 0, w: 1, h: 1, onglet: "route", niv: 2, type: "viaduc" },
    sable:      { nom: "Sable (plage)", cout: 18,  rev: 0,    w: 1, h: 1, onglet: "plage",    niv: 1, type: "sable" },
    rondPoint:  { nom: "Rond-point",   cout: 320,  rev: 1,    w: 1, h: 1, onglet: "route",    niv: 2, type: "rond" },

    /* --- habitat --- */
    maison:     { nom: "Maison",       cout: 90,   rev: 0.9,  hab: 4,   w: 1, h: 1, onglet: "habitat",  niv: 1, teinte: ["#e9d8b4", "#d96a3a"] },
    villa:      { nom: "Villa",        cout: 260,  rev: 2.6,  hab: 8,   w: 1, h: 1, onglet: "habitat",  niv: 2, teinte: ["#f4efe2", "#3b8fb8"] },
    immeuble:   { nom: "Immeuble",     cout: 620,  rev: 6.5,  hab: 30,  w: 1, h: 1, onglet: "habitat",  niv: 3, teinte: ["#c9b99c", "#b4533a"] },
    tour:       { nom: "Tour",         cout: 1900, rev: 20,   hab: 90,  w: 1, h: 1, onglet: "habitat",  niv: 5, teinte: ["#7fb6d6", "#2e5f86"] },
    gratte:     { nom: "Gratte-ciel",  cout: 5200, rev: 58,   hab: 220, w: 1, h: 1, onglet: "habitat",  niv: 7, teinte: ["#9bd0e8", "#1d4668"] },

    /* --- commerce --- */
    boutique:   { nom: "Boutique",     cout: 150,  rev: 3.2,  w: 1, h: 1, onglet: "commerce", niv: 1, teinte: ["#ffe08a", "#c8302f"] },
    marche:     { nom: "Marché",       cout: 420,  rev: 8.8,  w: 1, h: 1, onglet: "commerce", niv: 2, teinte: ["#f1a94a", "#2f9a58"] },
    marcheC:    { nom: "Marché central",cout: 1400,rev: 26,   w: 2, h: 2, onglet: "commerce", niv: 4, teinte: ["#e8c98a", "#c8302f"], drapeau: true },
    hotel:      { nom: "Hôtel",        cout: 1500, rev: 24,   w: 1, h: 1, onglet: "commerce", niv: 4, teinte: ["#f5ede0", "#c8302f"] },
    banque:     { nom: "Banque",       cout: 900,  rev: 15,   w: 1, h: 1, onglet: "commerce", niv: 3, teinte: ["#dfe6ea", "#1d4668"], drapeau: true },
    pharmacie:  { nom: "Pharmacie",    cout: 240,  rev: 5,    w: 1, h: 1, onglet: "commerce", niv: 2, teinte: ["#f2f6f4", "#009460"] },
    cinema:     { nom: "Cinéma",       cout: 1100, rev: 18,   w: 1, h: 1, onglet: "commerce", niv: 4, teinte: ["#3a3f4d", "#f5cf1b"] },

    /* --- plage / mer --- */
    parasol:    { nom: "Parasols",     cout: 60,   rev: 1.1,  w: 1, h: 1, onglet: "plage",    niv: 1, plage: true, teinte: ["#e8372f", "#f5cf1b"] },
    plage_b:    { nom: "Resto plage",  cout: 320,  rev: 6.5,  w: 1, h: 1, onglet: "plage",    niv: 2, plage: true, teinte: ["#f3d28a", "#2a9bd1"] },
    port:       { nom: "Port",         cout: 3200, rev: 52,   w: 2, h: 2, onglet: "plage",    niv: 3, mer: true, teinte: ["#8a6a45", "#4b3a28"], drapeau: true },

    /* --- loisirs --- */
    parc:       { nom: "Parc",         cout: 110,  rev: 0.4,  w: 1, h: 1, onglet: "loisirs",  niv: 1, bonheur: 4, teinte: ["#4f9b3f", "#2c6a28"] },
    place:      { nom: "Place",        cout: 200,  rev: 0.6,  w: 1, h: 1, onglet: "loisirs",  niv: 1, bonheur: 3, teinte: ["#cdc7b4", "#a9a294"] },
    monument:   { nom: "Monument",     cout: 1600, rev: 3,    w: 1, h: 1, onglet: "loisirs",  niv: 4, bonheur: 12, drapeau: true, teinte: ["#e8e2d2", "#c9a227"] },
    statue:     { nom: "Statue",       cout: 700,  rev: 1,    w: 1, h: 1, onglet: "loisirs",  niv: 3, bonheur: 7, teinte: ["#d9c48a", "#8a6a2a"] },
    stade:      { nom: "Stade",        cout: 4200, rev: 30,   w: 3, h: 2, onglet: "loisirs",  niv: 5, bonheur: 22, drapeau: true, teinte: ["#dfe4e0", "#1f8a4c"] },
    roue:       { nom: "Grande roue",  cout: 2400, rev: 30,   w: 1, h: 1, onglet: "loisirs",  niv: 5, bonheur: 10, teinte: ["#f06292", "#7cb342"] },

    /* --- services --- */
    ecole:      { nom: "École",        cout: 520,  rev: 0,    w: 1, h: 1, onglet: "services", niv: 2, bonheur: 7,  drapeau: true, teinte: ["#e5c15a", "#b3342e"] },
    hopital:    { nom: "Hôpital",      cout: 1100, rev: 0,    w: 1, h: 1, onglet: "services", niv: 3, bonheur: 11, drapeau: true, teinte: ["#f2f2ee", "#d11231"] },
    commissariat:{nom: "Commissariat", cout: 780,  rev: 0,    w: 1, h: 1, onglet: "services", niv: 3, bonheur: 10, drapeau: true, teinte: ["#e8eef2", "#1f4f8a"] },
    pompiers:   { nom: "Caserne pompiers",cout: 820, rev: 0,  w: 1, h: 1, onglet: "services", niv: 3, bonheur: 10, drapeau: true, teinte: ["#f3ece2", "#c8302f"] },
    mairie:     { nom: "Mairie",       cout: 1200, rev: 6,    w: 2, h: 1, onglet: "services", niv: 3, bonheur: 9,  drapeau: true, teinte: ["#efe6d2", "#8a6a45"] },
    prefecture: { nom: "Préfecture",   cout: 2400, rev: 12,   w: 2, h: 2, onglet: "services", niv: 5, bonheur: 14, drapeau: true, teinte: ["#f2ead6", "#b08b3a"] },
    universite: { nom: "Université",   cout: 1800, rev: 0,    w: 2, h: 1, onglet: "services", niv: 4, bonheur: 13, drapeau: true, teinte: ["#eae2cc", "#2e5f86"] },
    gare:       { nom: "Gare",         cout: 2800, rev: 34,   w: 2, h: 1, onglet: "services", niv: 4, bonheur: 6,  drapeau: true, teinte: ["#d9cdb3", "#3b6fb3"] },
    aeroport:   { nom: "Aéroport",     cout: 6800, rev: 70,   w: 3, h: 2, onglet: "services", niv: 6, bonheur: 10, drapeau: true, teinte: ["#e6e8ea", "#5b6570"] },
    mine:       { nom: "Mine",         cout: 2600, rev: 0,    w: 2, h: 2, onglet: "services", niv: 4, minerai: 26, drapeau: true, teinte: ["#8a7358", "#5c4a34"] },
    mosquee:    { nom: "Mosquée",      cout: 1500, rev: 4,    w: 1, h: 1, onglet: "services", niv: 2, bonheur: 16, culte: true, drapeau: true, teinte: ["#f4efe0", "#0f7a4a"] },
    eglise:     { nom: "Église",       cout: 1400, rev: 4,    w: 1, h: 1, onglet: "services", niv: 2, bonheur: 15, culte: true, teinte: ["#f6f2e8", "#7d5a3a"] },
    campMil:    { nom: "Camp militaire",cout: 3600, rev: 0,   w: 2, h: 2, onglet: "services", niv: 4, bonheur: 14, drapeau: true, teinte: ["#6f7a4a", "#4a5230"] },
    centrale:   { nom: "Centrale",     cout: 2900, rev: 0,    w: 2, h: 2, onglet: "services", niv: 3, energie: 40, teinte: ["#c9ccc4", "#7d8478"] },
    eolienne:   { nom: "Éolienne",     cout: 900,  rev: 0,    w: 1, h: 1, onglet: "services", niv: 2, energie: 8, teinte: ["#f2f4f2", "#9aa39a"] },
    piscine:    { nom: "Piscine",      cout: 700,  rev: 6,    w: 1, h: 1, onglet: "loisirs",  niv: 2, bonheur: 12, teinte: ["#2a9bd1", "#bfe6f2"] },
    basket:     { nom: "Terrain basket",cout: 420, rev: 3,    w: 1, h: 1, onglet: "loisirs",  niv: 1, bonheur: 9, teinte: ["#c98a4a", "#e8e2d2"] },
    bibliotheque:{ nom: "Bibliothèque",cout: 900,  rev: 5,    w: 1, h: 1, onglet: "services", niv: 2, bonheur: 13, drapeau: true, teinte: ["#eae3d0", "#8a6a45"] },
    phare:      { nom: "Phare",        cout: 1200, rev: 9,    w: 1, h: 1, onglet: "plage",    niv: 2, bonheur: 6, plage: true, teinte: ["#f4f4ee", "#c8302f"] },
    jardin:     { nom: "Jardin",       cout: 520,  rev: 4,    w: 1, h: 1, onglet: "loisirs",  niv: 1, bonheur: 14, teinte: ["#4f9b4a", "#3c7a38"] },
    roseraie:   { nom: "Roseraie",     cout: 780,  rev: 6,    w: 1, h: 1, onglet: "loisirs",  niv: 2, bonheur: 18, teinte: ["#c0557a", "#3c7a38"] },
    heliport:   { nom: "Héliport",     cout: 1500, rev: 12,   w: 1, h: 1, onglet: "services", niv: 3, bonheur: 5, teinte: ["#8f959c", "#5b6169"] },
    fusee:      { nom: "Site de lancement", cout: 4200, rev: 26, w: 2, h: 2, onglet: "services", niv: 4, bonheur: 16, drapeau: true, teinte: ["#c9ccd2", "#6d737b"] },
    tourBureaux:{ nom: "Tour de bureaux", cout: 1800, rev: 34, w: 1, h: 1, onglet: "commerce", niv: 3, bonheur: 2, teinte: ["#9fd3e0", "#5f8fa8"] },
    tourHab:    { nom: "Tour d'habitation", cout: 1300, rev: 18, w: 1, h: 1, onglet: "habitat", niv: 2, habitants: 24, teinte: ["#f0e6d2", "#c9a97c"] },
    obelisque:  { nom: "Obélisque",    cout: 1600, rev: 8,    w: 1, h: 1, onglet: "loisirs",  niv: 2, bonheur: 15, drapeau: true, teinte: ["#dcd3bd", "#b6ac93"] },
    arc:        { nom: "Arc de triomphe", cout: 2600, rev: 12, w: 1, h: 1, onglet: "loisirs", niv: 3, bonheur: 20, drapeau: true, teinte: ["#e4dcc6", "#bdaf8c"] },
    statueGeante:{ nom: "Grande statue", cout: 2200, rev: 9,  w: 1, h: 1, onglet: "loisirs",  niv: 3, bonheur: 18, teinte: ["#c8a15a", "#8f6f36"] },
    tourHorloge:{ nom: "Tour horloge", cout: 1400, rev: 10,   w: 1, h: 1, onglet: "loisirs",  niv: 2, bonheur: 13, drapeau: true, teinte: ["#ece3cd", "#b1976a"] },
  };

  const ONGLETS = [
    ["route", "🛣️ Voirie"], ["habitat", "🏠 Habitat"], ["commerce", "🛍️ Commerce"],
    ["plage", "🏖️ Mer"], ["loisirs", "🎡 Loisirs"], ["services", "🏛️ Services"],
  ];
  const XP_NIVEAU = (n) => 120 + n * n * 90;

  /* ------------------------------ état ------------------------------ */
  const etat = {
    ecran: "accueil",
    argent: 2500,
    xp: 0,
    niveau: 1,
    grille: new Array(N * N).fill(null),
    histo: [],
    rails: new Set(),
    itineraire: [],
    alertes: [],
    bateauxCanal: [],
    explosions: [],
    helico: null,
    fusee: null,
    cheminEau: [],
    unites: [],
    prochaineAlerte: 26,
    calme: 0,
    interventions: 0,
    eau: new Set(),          // canaux / rivieres traces par le joueur
    viaducs: new Set(),      // ponts aeriens au-dessus des routes
    sable: new Set(),        // plage dessinee par le joueur
    traficHaut: [],          // vehicules qui roulent sur les viaducs
    jourFixe: true,          // le joueur reste en pleine journee
    batiments: [],
    choix: "route",
    onglet: "route",
    gomme: false,
    selection: null,
    son: true,
    temps: 0,
    heure: 8,
    voitures: [],
    pietons: [],
    camions: [],
    train: null,
    avions: [],
    bateaux: [],
    nuages: [],
    flottants: [],
    revenuSec: 0,
    bonheur: 100,
    habitants: 0,
    minerai: 0,
    livraisons: 0,
    modifie: false,
    nuit: 0,
  };
  const G = (x, y) => (x < 0 || y < 0 || x >= N || y >= N) ? null : etat.grille[y * N + x];
  function casesDe(b) {
    const out = [];
    for (let i = 0; i < b.w; i++) for (let j = 0; j < b.h; j++) out.push([b.x + i, b.y + j]);
    return out;
  }

  /* ------------------------------ son ------------------------------ */
  let audio = null;
  function son(freq, duree, type, vol) {
    if (!etat.son) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = type || "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol == null ? 0.08 : vol, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duree);
      o.connect(g); g.connect(audio.destination);
      o.start(); o.stop(audio.currentTime + duree);
    } catch (e) {}
  }

  /* ------------------------------ projection ------------------------------ */
  const cam = { x: 0, y: 0, z: 1 };
  const camV = { x: 0, y: 0, z: 1 };
  let L = 0, Hc = 0;
  const iso = (gx, gy) => ({ x: (gx - gy) * TW / 2, y: (gx + gy) * TH / 2 });

  function versCase(sx, sy) {
    const wx = (sx - L / 2) / camV.z + camV.x;
    const wy = (sy - Hc / 2) / camV.z + camV.y;
    const gx = (wx / (TW / 2) + wy / (TH / 2)) / 2;
    const gy = (wy / (TH / 2) - wx / (TW / 2)) / 2;
    return { x: Math.floor(gx), y: Math.floor(gy) };
  }
  const ZOOM_MIN = 0.4, ZOOM_MAX = 2.8;

  function limiterCam() {
    // le centre de l'ecran doit rester sur le terrain : impossible de se perdre hors carte
    const gx = (cam.x / (TW / 2) + cam.y / (TH / 2)) / 2;
    const gy = (cam.y / (TH / 2) - cam.x / (TW / 2)) / 2;
    const cx = clamp(gx, 1.5, N - 2.5);
    const cy = clamp(gy, 1.5, N - 2.5);
    const p = iso(cx, cy);
    cam.x = p.x; cam.y = p.y;
    cam.z = clamp(cam.z, ZOOM_MIN, ZOOM_MAX);
  }

  /* ------------------------------ primitives ------------------------------ */
  function eclaircir(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
    return "rgb(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + ")";
  }
  function losange(ctx, cx, cy, w, h, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2); ctx.lineTo(cx + w / 2, cy);
    ctx.lineTo(cx, cy + h / 2); ctx.lineTo(cx - w / 2, cy);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.4; ctx.stroke(); }
  }
  function prisme(ctx, cx, cy, w, h, haut, murG, murD, toit) {
    const hw = w / 2, hh = h / 2;
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx, cy + hh - haut); ctx.lineTo(cx - hw, cy - haut);
    ctx.closePath(); ctx.fillStyle = murG; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + hw, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx, cy + hh - haut); ctx.lineTo(cx + hw, cy - haut);
    ctx.closePath(); ctx.fillStyle = murD; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh - haut); ctx.lineTo(cx + hw, cy - haut); ctx.lineTo(cx, cy + hh - haut); ctx.lineTo(cx - hw, cy - haut);
    ctx.closePath(); ctx.fillStyle = toit; ctx.fill();
  }
  function fenetres(ctx, cx, cy, w, h, haut, etages, nuit) {
    const hw = w / 2, hh = h / 2;
    for (let e = 0; e < etages; e++) {
      const y0 = cy - (e + 0.62) * (haut / Math.max(1, etages));
      for (let k = 0; k < 2; k++) {
        const t = 0.2 + k * 0.4;
        const lx = cx - hw + t * hw, ly = y0 + t * hh;
        ctx.fillStyle = nuit ? "rgba(255,232,150,0.95)" : "rgba(40,70,100,0.75)";
        ctx.beginPath();
        ctx.moveTo(lx, ly); ctx.lineTo(lx + hw * 0.18, ly + hh * 0.18);
        ctx.lineTo(lx + hw * 0.18, ly + hh * 0.18 - 4); ctx.lineTo(lx, ly - 4);
        ctx.closePath(); ctx.fill();
        const rx = cx + t * hw, ry = y0 + hh - t * hh;
        ctx.fillStyle = nuit ? "rgba(255,226,130,0.85)" : "rgba(30,56,84,0.8)";
        ctx.beginPath();
        ctx.moveTo(rx, ry); ctx.lineTo(rx + hw * 0.18, ry - hh * 0.18);
        ctx.lineTo(rx + hw * 0.18, ry - hh * 0.18 - 4); ctx.lineTo(rx, ry - 4);
        ctx.closePath(); ctx.fill();
      }
    }
  }
  function arbre(ctx, x, y, s, palmier) {
    ctx.fillStyle = "rgba(0,0,0,0.20)";
    ctx.beginPath(); ctx.ellipse(x + 2, y + 2, s * 0.7, s * 0.32, 0, 0, 6.283); ctx.fill();
    if (palmier) {
      ctx.strokeStyle = "#8a6a45"; ctx.lineWidth = Math.max(2, s * 0.22);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * 0.2, y - s * 0.9, x + s * 0.1, y - s * 1.6); ctx.stroke();
      ctx.fillStyle = "#2f9a4e";
      for (let i = 0; i < 6; i++) {
        const a = i * 1.047 + 0.3;
        ctx.beginPath();
        ctx.ellipse(x + s * 0.1 + Math.cos(a) * s * 0.55, y - s * 1.6 + Math.sin(a) * s * 0.26, s * 0.62, s * 0.17, a * 0.5, 0, 6.283);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = "#6b4c2e";
      ctx.fillRect(x - s * 0.1, y - s * 0.55, s * 0.2, s * 0.6);
      const gr = ctx.createRadialGradient(x - s * 0.2, y - s * 1.1, 1, x, y - s * 0.9, s * 0.9);
      gr.addColorStop(0, "#6fd05a"); gr.addColorStop(1, "#2d7a30");
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(x, y - s * 0.9, s * 0.78, 0, 6.283); ctx.fill();
    }
  }

  // drapeau guinéen : mât + trois bandes verticales
  function drapeauGN(ctx, x, y, h) {
    h = h || 26;
    ctx.strokeStyle = "#c9c9c2"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
    const w = h * 0.62, hh = h * 0.42, top = y - h;
    ctx.fillStyle = "#ce1126"; ctx.fillRect(x, top, w / 3, hh);
    ctx.fillStyle = "#fcd116"; ctx.fillRect(x + w / 3, top, w / 3, hh);
    ctx.fillStyle = "#009460"; ctx.fillRect(x + 2 * w / 3, top, w / 3, hh);
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 0.7;
    ctx.strokeRect(x, top, w, hh);
  }

  function lampadaire(ctx, x, y, nuit) {
    ctx.strokeStyle = "#8b8f96"; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 15); ctx.lineTo(x + 4, y - 17); ctx.stroke();
    ctx.fillStyle = nuit ? "#ffe9a8" : "#d8d8d0";
    ctx.beginPath(); ctx.arc(x + 5, y - 17, 2.1, 0, 6.283); ctx.fill();
    if (nuit) {
      const g = ctx.createRadialGradient(x + 5, y - 17, 0, x + 5, y - 17, 22);
      g.addColorStop(0, "rgba(255,225,150,0.55)");
      g.addColorStop(1, "rgba(255,225,150,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x + 5, y - 17, 22, 0, 6.283); ctx.fill();
    }
  }

  function feu(ctx, x, y, phase, horizontal) {
    ctx.fillStyle = "#3a3d42";
    ctx.fillRect(x - 1.6, y - 13, 3.2, 13);
    ctx.fillStyle = "#22252a";
    ctx.fillRect(x - 3, y - 20, 6, 9);
    const p = phase % 2;
    ctx.fillStyle = p < 0.5 ? "#ff3b30" : "#4a1a18";
    ctx.beginPath(); ctx.arc(x, y - 18, 1.5, 0, 6.283); ctx.fill();
    ctx.fillStyle = p < 0.5 ? "#3a2a10" : "#ffcc00";
    ctx.beginPath(); ctx.arc(x, y - 15.5, 1.5, 0, 6.283); ctx.fill();
    ctx.fillStyle = p < 0.5 ? "#123a1a" : "#34d058";
    ctx.beginPath(); ctx.arc(x, y - 13, 1.5, 0, 6.283); ctx.fill();
  }

  function regenererSol() { genererSol(); }

  /* ------------------------------ bâtiments ------------------------------ */
  function dessinerBatiment(ctx, cle, niv, t, gw, gh) {
    const m = CAT[cle];
    gw = gw || m.w; gh = gh || m.h;
    const [c1, c2] = m.teinte || ["#ccc", "#999"];
    const W = TW * 0.86 * gw, Hh = TH * 0.86 * gh;
    const nuit = etat.nuit > 0.5;
    const etages = cle === "gratte" ? 14 : cle === "tour" ? 9 : cle === "immeuble" ? 4 : cle === "hotel" ? 6 : 1;
    const haut = (cle === "gratte" ? 14 : cle === "tour" ? 9 : cle === "immeuble" ? 4 : cle === "hotel" ? 6 : 2) * 12;
    const h = haut;

    if (cle !== "parc" && cle !== "place" && cle !== "rondPoint" && cle !== "pont" && cle !== "rail") {
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath();
      ctx.moveTo(W * 0.5, 0); ctx.lineTo(W * 0.5 + h * 0.5, h * 0.26);
      ctx.lineTo(h * 0.5, Hh * 0.5 + h * 0.26); ctx.lineTo(0, Hh * 0.5);
      ctx.closePath(); ctx.fill();
    }

    switch (cle) {
      case "maison": {
        prisme(ctx, 0, 0, W * 0.8, Hh * 0.8, h, eclaircir(c1, -0.12), eclaircir(c1, -0.28), eclaircir(c1, 0.05));
        const hw = W * 0.4 + 3, hh = Hh * 0.4 + 2;
        ctx.fillStyle = eclaircir(c2, 0.1);
        ctx.beginPath(); ctx.moveTo(-hw, -h); ctx.lineTo(0, -h - hh - 9); ctx.lineTo(hw, -h); ctx.lineTo(0, -h + hh); ctx.closePath(); ctx.fill();
        ctx.fillStyle = eclaircir(c2, -0.3);
        ctx.beginPath(); ctx.moveTo(hw, -h); ctx.lineTo(0, -h - hh - 9); ctx.lineTo(0, -h + hh); ctx.closePath(); ctx.fill();
        fenetres(ctx, 0, 0, W * 0.8, Hh * 0.8, h, 1, nuit);
        break;
      }
      case "villa": {
        prisme(ctx, 0, 0, W * 0.86, Hh * 0.86, h, eclaircir(c1, -0.1), eclaircir(c1, -0.24), eclaircir(c1, 0.08));
        prisme(ctx, 6, -h, W * 0.4, Hh * 0.4, 8, eclaircir(c2, -0.1), eclaircir(c2, -0.3), eclaircir(c2, 0.2));
        fenetres(ctx, 0, 0, W * 0.86, Hh * 0.86, h, 1, nuit);
        losange(ctx, -W * 0.28, Hh * 0.22, W * 0.26, Hh * 0.26, "rgba(60,190,230,0.9)");
        break;
      }
      case "immeuble": case "tour": case "gratte": case "hotel": {
        const f = cle === "gratte" ? 0.7 : cle === "tour" ? 0.74 : cle === "hotel" ? 0.8 : 0.84;
        prisme(ctx, 0, 0, W * f, Hh * f, h, eclaircir(c1, -0.1), eclaircir(c1, -0.28), eclaircir(c2, 0.12));
        fenetres(ctx, 0, 0, W * f, Hh * f, h, etages, nuit);
        if (cle === "gratte") {
          prisme(ctx, 0, -h, W * 0.46, Hh * 0.46, 16, eclaircir(c1, -0.04), eclaircir(c1, -0.28), eclaircir(c2, 0.3));
          prisme(ctx, 0, -h - 16, W * 0.22, Hh * 0.22, 14, eclaircir(c1, 0.05), eclaircir(c1, -0.2), "#fff");
        } else if (cle === "tour") {
          prisme(ctx, 0, -h, W * 0.36, Hh * 0.36, 10, c2, eclaircir(c2, -0.3), eclaircir(c2, 0.3));
        } else {
          prisme(ctx, 0, -h, W * 0.5, Hh * 0.5, 6, "#8d8579", "#6d675d", "#a9a193");
        }
        if (cle === "hotel") {
          ctx.fillStyle = "#f5cf1b"; ctx.font = "bold 8px system-ui"; ctx.textAlign = "center";
          ctx.fillText("HOTEL", -W * 0.18, -h * 0.55);
          if (nuit) {
            ctx.font = "bold 9px system-ui";
            ctx.fillStyle = (Math.floor(t * 2) % 2) ? "#ff5252" : "#7a1e1e";
            ctx.fillText("HOTEL", -W * 0.18, -h * 0.55);
          }
        }
        break;
      }
      case "boutique": {
        prisme(ctx, 0, 0, W * 0.84, Hh * 0.84, 14, eclaircir(c1, -0.1), eclaircir(c1, -0.26), eclaircir(c1, 0.12));
        ctx.fillStyle = c2;
        ctx.beginPath(); ctx.moveTo(-W * 0.42, 2); ctx.lineTo(0, Hh * 0.42 + 2); ctx.lineTo(0, Hh * 0.42 + 12); ctx.lineTo(-W * 0.42, 12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = eclaircir(c2, -0.25);
        ctx.beginPath(); ctx.moveTo(W * 0.42, 2); ctx.lineTo(0, Hh * 0.42 + 2); ctx.lineTo(0, Hh * 0.42 + 12); ctx.lineTo(W * 0.42, 12); ctx.closePath(); ctx.fill();
        break;
      }
      case "marche": {
        losange(ctx, 0, 0, W * 0.9, Hh * 0.9, "#cdb88a");
        for (let i = 0; i < 4; i++) {
          const px = (i % 2 ? 1 : -1) * W * 0.18, py = (i < 2 ? -1 : 1) * Hh * 0.14;
          ctx.fillStyle = ["#e8372f", "#f5cf1b", "#2f9a58", "#3b8fb8"][i];
          ctx.beginPath(); ctx.moveTo(px - 11, py - 6); ctx.lineTo(px, py - 14); ctx.lineTo(px + 11, py - 6); ctx.lineTo(px, py + 1); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.fillRect(px - 1, py - 6, 2, 8);
        }
        break;
      }
      case "marcheC": {
        losange(ctx, 0, 0, W * 0.96, Hh * 0.96, "#d8c8a4");
        // halle centrale
        prisme(ctx, 0, -6, W * 0.6, Hh * 0.5, 12, "#c9b48a", "#a8946a", c2);
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * 6.283;
          const px = Math.cos(a) * W * 0.34, py = Math.sin(a) * Hh * 0.34 - 4;
          ctx.fillStyle = ["#e8372f", "#f5cf1b", "#2f9a58", "#3b8fb8"][i % 4];
          ctx.beginPath(); ctx.moveTo(px - 9, py - 5); ctx.lineTo(px, py - 12); ctx.lineTo(px + 9, py - 5); ctx.closePath(); ctx.fill();
        }
        break;
      }
      case "banque": {
        prisme(ctx, 0, 0, W * 0.86, Hh * 0.86, h, eclaircir(c1, -0.05), eclaircir(c1, -0.22), eclaircir(c1, 0.1));
        // colonnes
        for (let i = -2; i <= 2; i++) {
          ctx.fillStyle = "#f4f4f0";
          ctx.fillRect(i * 9 - 1.5, -h + 4, 3, h - 8);
        }
        prisme(ctx, 0, -h, W * 0.9, Hh * 0.66, 5, "#e8e4d6", "#c8c2b0", "#f7f5ec");
        break;
      }
      case "pharmacie": {
        prisme(ctx, 0, 0, W * 0.82, Hh * 0.82, 15, eclaircir(c1, -0.06), eclaircir(c1, -0.2), eclaircir(c1, 0.08));
        ctx.fillStyle = "#009460";
        ctx.fillRect(-4, -13, 8, 5); ctx.fillRect(-1.5, -16, 3, 11);
        if (nuit) { ctx.fillStyle = "rgba(120,255,180,0.55)"; ctx.fillRect(-5, -17, 10, 13); }
        break;
      }
      case "cinema": {
        prisme(ctx, 0, 0, W * 0.9, Hh * 0.9, 26, "#333844", "#23262e", "#1b1d23");
        ctx.fillStyle = "#f5cf1b"; ctx.font = "bold 8px system-ui"; ctx.textAlign = "center";
        ctx.fillText("CINÉ", 0, -22);
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = Math.floor(t * 3 + i) % 5 === 0 ? "#fff2a8" : "#5a5f6b";
          ctx.beginPath(); ctx.arc(-10 + i * 5, -6, 1.3, 0, 6.283); ctx.fill();
        }
        break;
      }
      case "mosquee": {
        prisme(ctx, 0, 0, W * 0.84, Hh * 0.84, 16, eclaircir(c1, -0.02), eclaircir(c1, -0.17), eclaircir(c1, 0.12));
        // dome vert
        ctx.fillStyle = "#0f8a52";
        ctx.beginPath(); ctx.arc(0, -17, W * 0.2, Math.PI, 0); ctx.fill();
        ctx.fillStyle = "#0c6f42";
        ctx.beginPath(); ctx.arc(0, -17, W * 0.2, Math.PI, Math.PI * 1.5); ctx.fill();
        // minaret
        ctx.fillStyle = eclaircir(c1, 0.1);
        ctx.fillRect(-W * 0.38, -34, 6, 34);
        ctx.fillStyle = "#0f8a52";
        ctx.beginPath(); ctx.arc(-W * 0.38 + 3, -34, 3.6, Math.PI, 0); ctx.fill();
        ctx.fillStyle = "#f5cf1b";
        ctx.beginPath(); ctx.arc(-W * 0.38 + 3, -39, 1.4, 0, 6.283); ctx.fill();
        // porte
        ctx.fillStyle = "#2e5f3e";
        ctx.beginPath(); ctx.arc(0, 4, 5, Math.PI, 0); ctx.fill(); ctx.fillRect(-5, 4, 10, 5);
        break;
      }
      case "eglise": {
        prisme(ctx, 0, 0, W * 0.8, Hh * 0.8, 14, eclaircir(c1, -0.02), eclaircir(c1, -0.16), "#8a5a3a");
        // clocher
        ctx.fillStyle = eclaircir(c1, 0.08);
        ctx.fillRect(W * 0.16, -40, 12, 40);
        ctx.fillStyle = "#7d5a3a";
        ctx.beginPath(); ctx.moveTo(W * 0.16 - 2, -40); ctx.lineTo(W * 0.16 + 6, -52); ctx.lineTo(W * 0.16 + 14, -40); ctx.closePath(); ctx.fill();
        // croix
        ctx.fillStyle = "#f5cf1b";
        ctx.fillRect(W * 0.16 + 5, -60, 2, 9); ctx.fillRect(W * 0.16 + 2, -58, 8, 2);
        // vitrail
        ctx.fillStyle = nuit ? "rgba(255,226,130,0.9)" : "rgba(120,80,200,0.7)";
        ctx.beginPath(); ctx.arc(-6, -10, 4, Math.PI, 0); ctx.fill();
        break;
      }
      case "campMil": {
        losange(ctx, 0, 0, W * 0.98, Hh * 0.98, "#6f7a4a");
        losange(ctx, 0, 0, W * 0.7, Hh * 0.7, "#7d8854");
        // tentes
        for (const [ox, oy] of [[-14, 2], [0, 8], [12, -2]]) {
          ctx.fillStyle = "#4a5230";
          ctx.beginPath(); ctx.moveTo(ox - 8, oy); ctx.lineTo(ox, oy - 9); ctx.lineTo(ox + 8, oy); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "#5d6739";
          ctx.beginPath(); ctx.moveTo(ox - 8, oy); ctx.lineTo(ox, oy - 9); ctx.lineTo(ox, oy); ctx.closePath(); ctx.fill();
        }
        // mirador
        ctx.fillStyle = "#4a5230"; ctx.fillRect(-2, -46, 3, 40); ctx.fillRect(2, -46, 3, 40);
        ctx.fillStyle = "#5d6739"; ctx.fillRect(-6, -54, 16, 9);
        // barbeles
        ctx.strokeStyle = "rgba(230,230,220,0.5)"; ctx.lineWidth = 1;
        for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 11, 14); ctx.lineTo(i * 11 + 6, 8); ctx.stroke(); }
        // jeep
        ctx.fillStyle = "#3d4528"; ctx.fillRect(10, 10, 15, 7);
        ctx.fillStyle = "#2b3120"; ctx.fillRect(12, 11, 5, 4);
        break;
      }
      case "centrale": {
        prisme(ctx, 0, 0, W * 0.92, Hh * 0.84, 20, "#c9ccc4", "#9aa096", "#8d948a");
        // cheminees
        for (const ox of [-12, 4]) {
          ctx.fillStyle = "#d7dad2"; ctx.fillRect(ox, -46, 8, 46);
          ctx.fillStyle = "#b3452f"; ctx.fillRect(ox, -46, 8, 5);
          ctx.fillStyle = "#8d948a"; ctx.fillRect(ox, -30, 8, 3);
        }
        // fumee
        ctx.fillStyle = "rgba(230,236,240,0.5)";
        for (let i = 0; i < 4; i++) {
          const f = (t * 0.5 + i * 0.25) % 1;
          ctx.beginPath(); ctx.arc(-8 + f * 22, -50 - f * 26, 4 + f * 7, 0, 6.283); ctx.fill();
        }
        // lignes electriques
        ctx.strokeStyle = "#5a615a"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-W * 0.42, -16); ctx.lineTo(-W * 0.42, 0); ctx.stroke();
        break;
      }
      case "eolienne": {
        losange(ctx, 0, 0, W * 0.9, Hh * 0.9, "#8aa06a");
        ctx.fillStyle = "#e8ece8"; ctx.fillRect(-1.6, -48, 3.2, 48);
        ctx.fillStyle = "#cfd6cf"; ctx.fillRect(-1.6, -48, 1.6, 48);
        ctx.save(); ctx.translate(0, -48); ctx.rotate(t * 1.6);
        for (let i = 0; i < 3; i++) {
          ctx.save(); ctx.rotate((i * 6.283) / 3);
          ctx.fillStyle = "#f2f6f2";
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(2.2, -3); ctx.lineTo(2.2, -22); ctx.lineTo(0, -24); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        ctx.fillStyle = "#cfd6cf"; ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, 6.283); ctx.fill();
        ctx.restore();
        break;
      }
      case "piscine": {
        losange(ctx, 0, 0, W * 0.98, Hh * 0.98, "#d9d2be");
        losange(ctx, 0, 0, W * 0.78, Hh * 0.78, "#2a9bd1");
        losange(ctx, 0, 0, W * 0.66, Hh * 0.66, "#48b6e4");
        ctx.strokeStyle = "rgba(255,255,255,0.65)"; ctx.lineWidth = 1;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(-W * 0.22, i * 5 - Math.sin(t * 2 + i) * 1.4);
          ctx.lineTo(W * 0.22, i * 5 + Math.sin(t * 2 + i) * 1.4);
          ctx.stroke();
        }
        // tremplin
        ctx.fillStyle = "#f2f2ea"; ctx.fillRect(W * 0.28, -6, 10, 3);
        break;
      }
      case "basket": {
        losange(ctx, 0, 0, W * 0.98, Hh * 0.98, "#c98a4a");
        losange(ctx, 0, 0, W * 0.72, Hh * 0.72, "#d99a58");
        ctx.strokeStyle = "#f6f2e6"; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-W * 0.34, 0); ctx.lineTo(W * 0.34, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, W * 0.14, 0, 6.283); ctx.stroke();
        // paniers
        for (const s2 of [-1, 1]) {
          ctx.fillStyle = "#e8e2d2";
          ctx.fillRect(s2 * W * 0.42 - 2, -26, 3, 26);
          ctx.fillStyle = "#f6f6f2"; ctx.fillRect(s2 * W * 0.42 - 7, -28, 12, 7);
          ctx.strokeStyle = "#e8563a"; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(s2 * W * 0.42 - 1, -22, 3.4, 0, Math.PI); ctx.stroke();
        }
        break;
      }
      case "jardin": {
        losange(ctx, 0, 0, W * 0.95, Hh * 0.95, "#5aa855");
        ctx.fillStyle = "#3f8a3c";
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * 6.283 + 0.4;
          ctx.beginPath(); ctx.arc(Math.cos(a) * W * 0.28, Math.sin(a) * Hh * 0.28 - 4, 3.4, 0, 6.283); ctx.fill();
        }
        ctx.fillStyle = "#e8dfc8";
        ctx.beginPath(); ctx.ellipse(0, 2, W * 0.18, Hh * 0.18, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = "#6fbf6a";
        for (let i = 0; i < 4; i++) ctx.fillRect(-1, -3 - i * 2.2, 2, 1.4);
        break;
      }
      case "roseraie": {
        losange(ctx, 0, 0, W * 0.95, Hh * 0.95, "#4f9b4a");
        for (let i = 0; i < 9; i++) {
          const a = i * 1.7;
          ctx.fillStyle = i % 2 ? "#c0557a" : "#e07a9c";
          const rr = W * 0.3;
          ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.6 - 3, 2.6, 0, 6.283); ctx.fill();
        }
        ctx.fillStyle = "#efe6d0"; ctx.fillRect(-1.4, -14, 2.8, 12);
        break;
      }
      case "heliport": {
        losange(ctx, 0, 0, W * 0.96, Hh * 0.96, "#8f959c");
        ctx.fillStyle = "#5b6169";
        ctx.beginPath(); ctx.arc(0, -3, W * 0.3, 0, 6.283); ctx.fill();
        ctx.font = "bold 13px system-ui"; ctx.fillStyle = "#f5cf1b";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("H", 0, -3);
        break;
      }
      case "fusee": {
        prisme(ctx, 0, 0, W * 0.94, Hh * 0.94, 8, "#b9bcc2", "#8e9299", "#d3d6db");
        // rampe
        ctx.fillStyle = "#6d737b";
        ctx.fillRect(-W * 0.28, -6, W * 0.56, 5);
        // la fusee
        ctx.save();
        ctx.translate(0, -10);
        const deco = etat.fusee ? etat.fusee.t : 0;
        const dy = deco > 0 ? -deco * 26 : 0;
        ctx.translate(0, dy);
        ctx.fillStyle = "#f4f6f8";
        ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(5, -8); ctx.lineTo(-5, -8); ctx.closePath(); ctx.fill();
        ctx.fillRect(-5, -8, 10, 16);
        ctx.fillStyle = "#c8302f"; ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(3, -18); ctx.lineTo(-3, -18); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#2f6fd0"; ctx.fillRect(-5, -2, 10, 3);
        if (deco > 0) {
          ctx.fillStyle = "rgba(255,180,60,0.9)";
          ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(0, 8 + 8 + Math.random() * 8); ctx.lineTo(4, 8); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "rgba(230,230,230,0.45)";
          ctx.beginPath(); ctx.arc(0, 16 + Math.random() * 6, 7 + deco * 8, 0, 6.283); ctx.fill();
        }
        ctx.restore();
        break;
      }
      case "tourBureaux": {
        prisme(ctx, 0, 0, W * 0.7, Hh * 0.7, 62, c1, eclaircir(c1, -0.22), c2);
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        for (let r = 0; r < 7; r++) for (let c = -1; c <= 1; c++) ctx.fillRect(c * 8 - 2.2, -58 + r * 8, 4.4, 3.2);
        ctx.fillStyle = "#5b6169"; ctx.fillRect(-1, -70, 2, 10);
        break;
      }
      case "tourHab": {
        prisme(ctx, 0, 0, W * 0.78, Hh * 0.78, 44, c1, eclaircir(c1, -0.2), c2);
        for (let r = 0; r < 5; r++) {
          ctx.fillStyle = nuit ? "rgba(255,225,150,0.95)" : "rgba(120,150,175,0.8)";
          for (let c = -1; c <= 1; c++) ctx.fillRect(c * 9 - 2.4, -40 + r * 8, 4.8, 3.6);
        }
        ctx.fillStyle = "#b9a882"; ctx.fillRect(-9, -46, 18, 3);
        break;
      }
      case "obelisque": {
        losange(ctx, 0, 0, W * 0.8, Hh * 0.8, "#d8cfb8");
        ctx.fillStyle = "#dcd3bd";
        ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-2.4, -34); ctx.lineTo(2.4, -34); ctx.lineTo(5, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#f0e9d6";
        ctx.beginPath(); ctx.moveTo(-2.4, -34); ctx.lineTo(0, -42); ctx.lineTo(2.4, -34); ctx.closePath(); ctx.fill();
        break;
      }
      case "arc": {
        losange(ctx, 0, 0, W * 0.92, Hh * 0.92, "#ddd4bd");
        ctx.fillStyle = "#e4dcc6";
        ctx.fillRect(-14, -30, 7, 30); ctx.fillRect(7, -30, 7, 30);
        ctx.fillRect(-14, -34, 28, 7);
        ctx.fillStyle = "#b8ad92";
        ctx.fillRect(-14, -30, 2, 30); ctx.fillRect(14, -30, 2, 30);
        break;
      }
      case "statueGeante": {
        losange(ctx, 0, 0, W * 0.86, Hh * 0.86, "#cfc6ae");
        ctx.fillStyle = "#c8a15a";
        ctx.beginPath(); ctx.arc(0, -22, 5, 0, 6.283); ctx.fill();
        ctx.fillRect(-4, -18, 8, 14);
        ctx.fillRect(-9, -16, 5, 3);
        ctx.fillStyle = "#8f6f36";
        ctx.fillRect(-6, -4, 12, 4);
        break;
      }
      case "tourHorloge": {
        prisme(ctx, 0, 0, W * 0.62, Hh * 0.62, 40, c1, eclaircir(c1, -0.2), c2);
        ctx.fillStyle = "#f4efdd";
        ctx.beginPath(); ctx.arc(0, -34, 5.4, 0, 6.283); ctx.fill();
        ctx.strokeStyle = "#3a3a3a"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(0, -37.4); ctx.moveTo(0, -34); ctx.lineTo(2.6, -33); ctx.stroke();
        ctx.fillStyle = "#b1976a";
        ctx.beginPath(); ctx.moveTo(-7, -41); ctx.lineTo(0, -48); ctx.lineTo(7, -41); ctx.closePath(); ctx.fill();
        break;
      }
      case "bibliotheque": {
        prisme(ctx, 0, 0, W * 0.88, Hh * 0.88, 18, eclaircir(c1, -0.02), eclaircir(c1, -0.16), eclaircir(c1, 0.06));
        // colonnes
        ctx.fillStyle = eclaircir(c1, 0.18);
        for (let i = -2; i <= 2; i++) ctx.fillRect(i * 7 - 1, -16, 2.4, 16);
        // fronton
        ctx.fillStyle = "#c9b98a";
        ctx.beginPath(); ctx.moveTo(-W * 0.34, -18); ctx.lineTo(0, -30); ctx.lineTo(W * 0.34, -18); ctx.closePath(); ctx.fill();
        break;
      }
      case "phare": {
        losange(ctx, 0, 0, W * 0.9, Hh * 0.9, "#e8d9a8");
        // tour rayee
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = i % 2 ? "#c8302f" : "#f4f4ee";
          const w2 = 9 - i * 1.2;
          ctx.fillRect(-w2 / 2, -8 - i * 11, w2, 11);
        }
        // lanterne
        ctx.fillStyle = "#f5cf1b";
        ctx.beginPath(); ctx.arc(0, -62, 4.2, 0, 6.283); ctx.fill();
        if (nuit) {
          ctx.globalAlpha = 0.35;
          ctx.beginPath(); ctx.arc(0, -62, 16, 0, 6.283); ctx.fill();
          ctx.globalAlpha = 1;
          // faisceau tournant
          ctx.save(); ctx.translate(0, -62); ctx.rotate(t * 1.2);
          ctx.fillStyle = "rgba(255,240,180,0.22)";
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(48, -9); ctx.lineTo(48, 9); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        break;
      }
      case "port": {
        // quai sur l'eau
        losange(ctx, 0, 0, W * 0.98, Hh * 0.98, "#2a6f93");
        prisme(ctx, 0, 6, W * 0.94, Hh * 0.7, 5, "#8a7358", "#5c4a34", "#b59a72");
        // grues
        for (let i = -1; i <= 1; i++) {
          const px = i * W * 0.26;
          ctx.strokeStyle = "#e8c227"; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.moveTo(px, -2); ctx.lineTo(px, -26); ctx.lineTo(px + 16, -22); ctx.stroke();
          ctx.strokeStyle = "#c9a51f"; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(px + 16, -22); ctx.lineTo(px + 16, -12); ctx.stroke();
        }
        // bateau de fret
        ctx.fillStyle = "#243b52";
        ctx.beginPath(); ctx.moveTo(-22, 4); ctx.lineTo(22, 4); ctx.lineTo(16, 12); ctx.lineTo(-16, 12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#e8372f"; ctx.fillRect(-22, 4, 44, 2);
        for (let i = 0; i < 3; i++) { ctx.fillStyle = ["#2f9a58", "#f5cf1b", "#3b8fb8"][i]; ctx.fillRect(-16 + i * 9, -2, 7, 6); }
        // conteneurs empiles
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = ["#c8302f", "#2f9a58", "#2e5f86", "#e8a33a"][i % 4];
          ctx.fillRect(10 + (i % 3) * 8, -8 - Math.floor(i / 3) * 5, 7, 4);
        }
        break;
      }
      case "parasol": {
        for (let i = 0; i < 2; i++) {
          const px = i ? 12 : -12, py = i ? 6 : -4;
          ctx.strokeStyle = "#6b5a40"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 16); ctx.stroke();
          ctx.fillStyle = i ? c1 : c2;
          ctx.beginPath(); ctx.ellipse(px, py - 16, 12, 5, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
          losange(ctx, px + 6, py + 6, 16, 7, "#2a9bd1");
        }
        break;
      }
      case "plage_b": {
        // le sable et les parasols sont dessines par le sol et les accessoires

        prisme(ctx, 0, 0, W * 0.7, Hh * 0.7, 14, "#f6ecd0", "#cdbf9c", c2);
        ctx.fillStyle = c2;
        ctx.beginPath(); ctx.moveTo(-W * 0.38, -12); ctx.lineTo(0, -12 - Hh * 0.38); ctx.lineTo(W * 0.38, -12); ctx.lineTo(0, -12 + Hh * 0.38); ctx.closePath(); ctx.fill();
        arbre(ctx, W * 0.34, Hh * 0.2, 7, true);
        break;
      }
      case "parc": {
        losange(ctx, 0, 0, W * 0.96, Hh * 0.96, "#5bb04a");
        losange(ctx, 0, 0, W * 0.58, Hh * 0.58, "#6bc258");
        arbre(ctx, -W * 0.24, -2, 11, false);
        arbre(ctx, W * 0.2, 4, 9, false);
        ctx.fillStyle = "#f4a3c0";
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-6 + i * 4, 8 + (i % 2) * 2, 1.4, 0, 6.283); ctx.fill(); }
        break;
      }
      case "place": {
        losange(ctx, 0, 0, W * 0.98, Hh * 0.98, "#cdc7b4");
        losange(ctx, 0, 0, W * 0.6, Hh * 0.6, "#ded9c8");
        ctx.strokeStyle = "rgba(120,115,100,0.5)"; ctx.lineWidth = 1;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath(); ctx.moveTo(i * 10, -TH * 0.24); ctx.lineTo(i * 10, TH * 0.24); ctx.stroke();
        }
        arbre(ctx, -W * 0.3, 2, 8, false);
        arbre(ctx, W * 0.3, 2, 8, false);
        break;
      }
      case "monument": {
        losange(ctx, 0, 0, W * 0.94, Hh * 0.94, "#d8d2c0");
        // socle
        prisme(ctx, 0, 0, W * 0.5, Hh * 0.5, 8, "#cfc8b4", "#a9a28e", "#e2dcc8");
        // obélisque doré
        ctx.fillStyle = "#c9a227";
        ctx.beginPath();
        ctx.moveTo(-6, -8); ctx.lineTo(6, -8); ctx.lineTo(3, -46); ctx.lineTo(0, -54); ctx.lineTo(-3, -46);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#e8c85a";
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, -8); ctx.lineTo(0, -54); ctx.closePath(); ctx.fill();
        break;
      }
      case "statue": {
        losange(ctx, 0, 0, W * 0.9, Hh * 0.9, "#cfc9b8");
        prisme(ctx, 0, 0, W * 0.36, Hh * 0.36, 9, "#b8b19c", "#958e7a", "#d6cfba");
        ctx.fillStyle = "#8a6a2a";
        ctx.beginPath(); ctx.arc(0, -20, 4.5, 0, 6.283); ctx.fill();
        ctx.fillRect(-3, -16, 6, 8);
        ctx.beginPath(); ctx.moveTo(-3, -16); ctx.lineTo(-9, -24); ctx.lineTo(-6, -26); ctx.lineTo(0, -19); ctx.closePath(); ctx.fill();
        break;
      }
      case "stade": {
        losange(ctx, 0, 0, W * 0.99, Hh * 0.99, "#dfe4e0");
        // gradins
        prisme(ctx, 0, 0, W * 0.96, Hh * 0.96, 12, "#cfd6d2", "#a9b2ad", "#b9c2bd");
        // pelouse
        const gz = ctx.createLinearGradient(-W * 0.2, 0, W * 0.2, 0);
        gz.addColorStop(0, "#2f9a58"); gz.addColorStop(1, "#248a4c");
        losange(ctx, 0, -12, W * 0.5, Hh * 0.5, "#2f9a58");
        ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1.2;
        losange(ctx, 0, -12, W * 0.34, Hh * 0.34, null, "rgba(255,255,255,0.8)");
        // projecteurs
        for (const sx of [-W * 0.4, W * 0.4]) {
          ctx.strokeStyle = "#9aa0a6"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(sx, -10); ctx.lineTo(sx, -44); ctx.stroke();
          ctx.fillStyle = nuit ? "#fff6c8" : "#e8e8e0";
          ctx.fillRect(sx - 6, -50, 12, 6);
          if (nuit) {
            const g = ctx.createRadialGradient(sx, -46, 0, sx, -46, 40);
            g.addColorStop(0, "rgba(255,248,200,0.5)"); g.addColorStop(1, "rgba(255,248,200,0)");
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, -46, 40, 0, 6.283); ctx.fill();
          }
        }
        break;
      }
      case "roue": {
        const R = 36, cyr = -R - 12;
        ctx.strokeStyle = "#4b4f5a"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-14, 6); ctx.lineTo(0, cyr); ctx.lineTo(14, 6); ctx.stroke();
        ctx.lineWidth = 3; ctx.strokeStyle = "#ff8fb1";
        ctx.beginPath(); ctx.arc(0, cyr, R, 0, 6.283); ctx.stroke();
        ctx.lineWidth = 1.3; ctx.strokeStyle = "#e6e6ef";
        for (let i = 0; i < 8; i++) {
          const a = i * 0.785 + t * 0.35;
          ctx.beginPath(); ctx.moveTo(0, cyr); ctx.lineTo(Math.cos(a) * R, cyr + Math.sin(a) * R); ctx.stroke();
          ctx.fillStyle = ["#e8372f", "#f5cf1b", "#2f9a58", "#3b8fb8"][i % 4];
          ctx.beginPath(); ctx.arc(Math.cos(a) * R, cyr + Math.sin(a) * R + 3, 3.6, 0, 6.283); ctx.fill();
        }
        break;
      }
      case "ecole": {
        prisme(ctx, 0, 0, W * 0.9, Hh * 0.9, 16, eclaircir(c1, -0.08), eclaircir(c1, -0.26), c2);
        fenetres(ctx, 0, 0, W * 0.9, Hh * 0.9, 16, 2, nuit);
        // cour
        losange(ctx, W * 0.34, Hh * 0.34, W * 0.34, Hh * 0.34, "#c9b99c");
        break;
      }
      case "hopital": {
        prisme(ctx, 0, 0, W * 0.88, Hh * 0.88, 24, "#ececea", "#c6c6c2", "#f7f7f5");
        fenetres(ctx, 0, 0, W * 0.88, Hh * 0.88, 24, 3, nuit);
        ctx.fillStyle = "#d11231";
        ctx.fillRect(-1.7, -22, 3.4, 10); ctx.fillRect(-5, -18.5, 10, 3.2);
        break;
      }
      case "commissariat": {
        prisme(ctx, 0, 0, W * 0.88, Hh * 0.88, 18, eclaircir(c1, -0.05), eclaircir(c1, -0.2), eclaircir(c2, 0.1));
        ctx.fillStyle = "#f5cf1b"; ctx.font = "bold 7px system-ui"; ctx.textAlign = "center";
        ctx.fillText("POLICE", 0, -14);
        if (nuit) {
          ctx.fillStyle = (Math.floor(t * 4) % 2) ? "rgba(60,120,255,0.9)" : "rgba(255,60,60,0.9)";
          ctx.beginPath(); ctx.arc(0, -20, 3, 0, 6.283); ctx.fill();
          const g = ctx.createRadialGradient(0, -20, 0, 0, -20, 26);
          g.addColorStop(0, (Math.floor(t * 4) % 2) ? "rgba(60,120,255,0.45)" : "rgba(255,60,60,0.45)");
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -20, 26, 0, 6.283); ctx.fill();
        }
        break;
      }
      case "pompiers": {
        prisme(ctx, 0, 0, W * 0.9, Hh * 0.9, 18, eclaircir(c1, -0.05), eclaircir(c1, -0.22), "#c8302f");
        // grande porte
        ctx.fillStyle = "#7a1a18"; ctx.fillRect(-8, -12, 16, 12);
        ctx.fillStyle = "#c8302f";
        for (let i = -1; i <= 1; i++) ctx.fillRect(i * 5 - 1.5, -12, 3, 12);
        // camion
        ctx.fillStyle = "#d3232f"; ctx.fillRect(-6, -6, 13, 5);
        ctx.fillStyle = "#f4f4f0"; ctx.fillRect(2, -8, 5, 4);
        break;
      }
      case "mairie": {
        prisme(ctx, 0, 0, W * 0.94, Hh * 0.9, 22, eclaircir(c1, -0.05), eclaircir(c1, -0.22), eclaircir(c1, 0.08));
        fenetres(ctx, 0, 0, W * 0.94, Hh * 0.9, 22, 2, nuit);
        prisme(ctx, 0, -22, W * 0.4, Hh * 0.3, 10, "#e8e0cc", "#c9c0a6", "#f2ecdc");
        ctx.fillStyle = "#8a6a45";
        ctx.fillRect(-2, -20, 4, 14);
        break;
      }
      case "prefecture": {
        prisme(ctx, 0, 0, W * 0.95, Hh * 0.95, 34, eclaircir(c1, -0.04), eclaircir(c1, -0.2), eclaircir(c1, 0.1));
        fenetres(ctx, 0, 0, W * 0.95, Hh * 0.95, 34, 4, nuit);
        prisme(ctx, 0, -34, W * 0.52, Hh * 0.42, 10, "#f2ead6", "#d6cdb2", "#fff9ea");
        // colonnade
        for (let i = -3; i <= 3; i++) {
          ctx.fillStyle = "#fdf7e8";
          ctx.fillRect(i * 11 - 1.6, -30, 3.2, 28);
        }
        break;
      }
      case "universite": {
        prisme(ctx, 0, 0, W * 0.94, Hh * 0.9, 24, eclaircir(c1, -0.06), eclaircir(c1, -0.24), eclaircir(c2, 0.3));
        fenetres(ctx, 0, 0, W * 0.94, Hh * 0.9, 24, 3, nuit);
        ctx.fillStyle = "#fff"; ctx.font = "bold 7px system-ui"; ctx.textAlign = "center";
        ctx.fillText("UNIVERSITÉ", 0, -16);
        break;
      }
      case "gare": {
        // corps + verrière
        prisme(ctx, 0, 0, W * 0.96, Hh * 0.86, 20, eclaircir(c1, -0.06), eclaircir(c1, -0.24), c2);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath(); ctx.arc(0, -20, 10, Math.PI, 0); ctx.closePath(); ctx.fill();
        // horloge
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, -22, 3.4, 0, 6.283); ctx.fill();
        ctx.strokeStyle = "#333"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, -24.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(2, -22); ctx.stroke();
        break;
      }
      case "aeroport": {
        // piste
        losange(ctx, 0, 0, W * 0.99, Hh * 0.99, "#6b7076");
        ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 2;
        ctx.setLineDash([9, 9]);
        ctx.beginPath(); ctx.moveTo(-W * 0.42, -Hh * 0.06); ctx.lineTo(W * 0.42, Hh * 0.06); ctx.stroke();
        ctx.setLineDash([]);
        // marquages de seuil
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.fillRect(-W * 0.44 + i * 4, -Hh * 0.2 + i * 0.6, 2, 7);
        }
        // terminal
        prisme(ctx, -W * 0.18, -Hh * 0.34, W * 0.42, Hh * 0.34, 18, "#eef0f2", "#cdd2d6", "#dfe4e8");
        fenetres(ctx, -W * 0.18, -Hh * 0.34, W * 0.42, Hh * 0.34, 18, 2, nuit);
        // tour de contrôle
        ctx.strokeStyle = "#b8bdc2"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(W * 0.3, -6); ctx.lineTo(W * 0.3, -34); ctx.stroke();
        ctx.fillStyle = "#9fd4e8";
        ctx.beginPath(); ctx.ellipse(W * 0.3, -38, 9, 5, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = "#7d8288";
        ctx.beginPath(); ctx.ellipse(W * 0.3, -40, 10, 4, 0, 0, 6.283); ctx.fill();
        if (nuit) {
          ctx.fillStyle = "rgba(255,60,60," + (0.4 + 0.6 * Math.abs(Math.sin(t * 3))).toFixed(2) + ")";
          ctx.beginPath(); ctx.arc(W * 0.3, -44, 2, 0, 6.283); ctx.fill();
        }
        // avion au sol
        ctx.save();
        ctx.translate(-W * 0.2, Hh * 0.16);
        ctx.fillStyle = "#f4f6f8";
        ctx.beginPath(); ctx.ellipse(0, 0, 13, 3.4, 0, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(4, 0); ctx.lineTo(-1, -9); ctx.lineTo(-4, -9); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#009460";
        ctx.beginPath(); ctx.ellipse(0, 0, 13, 3.4, 0, 0, 6.283); ctx.stroke();
        ctx.fillStyle = "#ce1126"; ctx.fillRect(8, -1, 4, 2);
        ctx.restore();
        break;
      }
      case "mine": {
        // terrain creusé
        losange(ctx, 0, 0, W * 0.98, Hh * 0.98, "#8a7358");
        losange(ctx, 0, 0, W * 0.7, Hh * 0.7, "#6f5b44");
        // gradins d'excavation
        for (let i = 0; i < 3; i++) {
          losange(ctx, 0, 0, W * (0.6 - i * 0.14), Hh * (0.6 - i * 0.14), i % 2 ? "#5c4a34" : "#6b5640");
        }
        // chevalement
        ctx.strokeStyle = "#4a4238"; ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-10, -4); ctx.lineTo(-4, -32); ctx.lineTo(4, -32); ctx.lineTo(10, -4);
        ctx.moveTo(-7, -16); ctx.lineTo(7, -16);
        ctx.moveTo(-5, -26); ctx.lineTo(5, -26);
        ctx.stroke();
        // poulie + câble
        ctx.fillStyle = "#8a8f96"; ctx.beginPath(); ctx.arc(0, -34, 3, 0, 6.283); ctx.fill();
        ctx.strokeStyle = "#2b2b2b"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -31); ctx.lineTo(0, -14); ctx.stroke();
        // tas de minerai
        ctx.fillStyle = "#c26a2a";
        ctx.beginPath(); ctx.moveTo(W * 0.26, Hh * 0.2); ctx.lineTo(W * 0.26 + 13, Hh * 0.2 + 4); ctx.lineTo(W * 0.26 - 4, Hh * 0.2 + 9); ctx.closePath(); ctx.fill();
        break;
      }
      case "rondPoint": {
        losange(ctx, 0, 0, TW * 0.99, TH * 0.99, "#4c525c");
        losange(ctx, 0, 0, TW * 0.62, TH * 0.62, "#5bb04a");
        losange(ctx, 0, 0, TW * 0.3, TH * 0.3, "#6bc258");
        arbre(ctx, 0, 0, 9, false);
        break;
      }
      case "pont": {
        // tablier sur l'eau
        prisme(ctx, 0, 0, TW * 0.99, TH * 0.72, 6, "#9a9a92", "#7a7a72", "#b6b6ac");
        ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-TW * 0.3, -2); ctx.lineTo(TW * 0.3, -2); ctx.stroke();
        break;
      }
      default:
        prisme(ctx, 0, 0, W * 0.84, Hh * 0.84, Math.max(10, h), c1, eclaircir(c1, -0.2), c2);
    }

    // drapeau guinéen sur les bâtiments administratifs
    if (m.drapeau) {
      const bx = -W * 0.34, by = 2;
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath(); ctx.ellipse(bx + 1, by + 1, 5, 2, 0, 0, 6.283); ctx.fill();
      drapeauGN(ctx, bx, by, 30);
    }
  }

  /* ------------------------------ sol ------------------------------ */
  let sol = null, solOrigine = { x: 0, y: 0 };

  function genererSol() {
    const r = prng(9911);
    const ext = N * TW, marge = 300;
    const c = document.createElement("canvas");
    c.width = ext + marge * 2;
    c.height = N * TH + marge * 2;
    const g = c.getContext("2d");
    g.translate(marge + ext / 2, marge);
    solOrigine = { x: marge + ext / 2, y: marge };
    g.fillStyle = "#1a8fc4";
    g.fillRect(-ext, -marge, ext * 2, c.height);

    for (let s = 0; s <= 2 * (N - 1); s++) {
      for (let x = 0; x < N; x++) {
        const y = s - x;
        if (y < 0 || y >= N) continue;
        const p = iso(x, y);
        const ty = typeSol(x, y);
        let col;
        if (ty === 2) col = ["#2aa6d8", "#2fadde", "#2499cc", "#33b2e0", "#289fd1"][(x * 7 + y * 13) % 5];
        else if (ty === 1) col = (x + y) % 2 ? "#f0d9a0" : "#ecd397";
        else col = (x + y) % 2 ? "#6cbf4b" : "#66b947";
        losange(g, p.x, p.y, TW + 1, TH + 1, col);
        if (ty === 2 && r() < 0.2) {
          g.strokeStyle = "rgba(255,255,255,0.22)"; g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(p.x - 8, p.y); g.lineTo(p.x + 6, p.y); g.stroke();
        }
        if (ty === 0 && r() < 0.25) {
          g.fillStyle = "rgba(255,255,255,0.07)";
          g.beginPath(); g.arc(p.x + (r() - 0.5) * 20, p.y + (r() - 0.5) * 8, 2 + r() * 3, 0, 6.283); g.fill();
        }
      }
    }
    // écume
    for (let s = 0; s <= 2 * (N - 1); s++) {
      for (let x = 0; x < N; x++) {
        const y = s - x;
        if (y < 0 || y >= N || typeSol(x, y) !== 2) continue;
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
          const tx = x + dx, ty2 = y + dy;
          if (tx < 0 || ty2 < 0 || tx >= N || ty2 >= N) continue;
          if (typeSol(tx, ty2) === 1) {
            const p = iso(x, y), q = iso(tx, ty2);
            g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 2;
            g.beginPath();
            g.moveTo((p.x + q.x) / 2 - 8, (p.y + q.y) / 2);
            g.lineTo((p.x + q.x) / 2 + 8, (p.y + q.y) / 2);
            g.stroke();
          }
        }
      }
    }
    sol = c;
  }

  function dessinerTrottoir(ctx, x, y) {
    // meme gabarit que la route : une seule dalle a plat, bordure fine
    losange(ctx, 0, 0, TW * 0.92, TH * 0.92, "#b9b29c");
    losange(ctx, 0, 0, TW * 0.80, TH * 0.80, "#c9c2ac");
    ctx.strokeStyle = "rgba(150,143,126,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-TW * 0.20, -TH * 0.20);
    ctx.lineTo(TW * 0.20, TH * 0.20);
    ctx.moveTo(TW * 0.20, -TH * 0.20);
    ctx.lineTo(-TW * 0.20, TH * 0.20);
    ctx.stroke();
  }

  function dessinerRoute(ctx, x, y) {
    const n = !!(G(x, y - 1) && (G(x, y - 1).cle === "route" || G(x, y - 1).cle === "rondPoint"));
    const s = !!(G(x, y + 1) && (G(x, y + 1).cle === "route" || G(x, y + 1).cle === "rondPoint"));
    const o = !!(G(x - 1, y) && (G(x - 1, y).cle === "route" || G(x - 1, y).cle === "rondPoint"));
    const e = !!(G(x + 1, y) && (G(x + 1, y).cle === "route" || G(x + 1, y).cle === "rondPoint"));
    losange(ctx, 0, 0, TW + 1, TH + 1, "#4c525c");
    ctx.strokeStyle = "rgba(240,240,230,0.6)"; ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    if (o) { ctx.moveTo(0, 0); ctx.lineTo(-TW / 4, -TH / 4); }
    if (n) { ctx.moveTo(0, 0); ctx.lineTo(TW / 4, -TH / 4); }
    if (e) { ctx.moveTo(0, 0); ctx.lineTo(TW / 4, TH / 4); }
    if (s) { ctx.moveTo(0, 0); ctx.lineTo(-TW / 4, TH / 4); }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(210,205,190,0.85)"; ctx.lineWidth = 2.2;
    const hw = TW / 2, hh = TH / 2;
    ctx.beginPath();
    if (!o) { ctx.moveTo(0, -hh + 1); ctx.lineTo(-hw + 2, 0); }
    if (!n) { ctx.moveTo(0, -hh + 1); ctx.lineTo(hw - 2, 0); }
    if (!e) { ctx.moveTo(hw - 2, 0); ctx.lineTo(0, hh - 1); }
    if (!s) { ctx.moveTo(-hw + 2, 0); ctx.lineTo(0, hh - 1); }
    ctx.stroke();
  }

  function dessinerRail(ctx, x, y) {
    const n = !!(G(x, y - 1) && G(x, y - 1).cle === "rail");
    const s = !!(G(x, y + 1) && G(x, y + 1).cle === "rail");
    const o = !!(G(x - 1, y) && G(x - 1, y).cle === "rail");
    const e = !!(G(x + 1, y) && G(x + 1, y).cle === "rail");
    losange(ctx, 0, 0, TW + 1, TH + 1, "#6f6656");
    // traverses
    ctx.strokeStyle = "#5a4a36"; ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      const t = i / 4;
      if (o || n) { ctx.beginPath(); ctx.moveTo(t * TW * 0.4 - 5, t * TH * 0.4 - 5); ctx.lineTo(t * TW * 0.4 + 5, t * TH * 0.4 + 5); ctx.stroke(); }
      if (e || s) { ctx.beginPath(); ctx.moveTo(t * TW * 0.4 - 5, -t * TH * 0.4 + 5); ctx.lineTo(t * TW * 0.4 + 5, -t * TH * 0.4 - 5); ctx.stroke(); }
    }
    // rails
    ctx.strokeStyle = "#b9c0c8"; ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (o || n) { ctx.moveTo(-TW / 4, -TH / 4); ctx.lineTo(TW / 4, TH / 4); }
    else if (e || s) { ctx.moveTo(TW / 4, -TH / 4); ctx.lineTo(-TW / 4, TH / 4); }
    else { ctx.moveTo(-TW / 4, -TH / 4); ctx.lineTo(TW / 4, TH / 4); }
    ctx.stroke();
    ctx.beginPath();
    if (o || n) { ctx.moveTo(-TW / 4 + 4, -TH / 4 + 2); ctx.lineTo(TW / 4 + 4, TH / 4 + 2); }
    else { ctx.moveTo(TW / 4 - 4, -TH / 4 + 2); ctx.lineTo(-TW / 4 - 4, TH / 4 + 2); }
    ctx.stroke();
  }

  /* ------------------------------ décor ------------------------------ */
  const deco = [];
  function genererDeco() {
    deco.length = 0;
    const r = prng(4242);
    for (let i = 0; i < 220; i++) {
      const x = Math.floor(r() * N), y = Math.floor(r() * N);
      const ty = typeSol(x, y);
      if (ty === 2) continue;
      deco.push({ x, y, ox: (r() - 0.5) * 0.72, oy: (r() - 0.5) * 0.72, palmier: ty === 1, s: 8 + r() * 6 });
    }
  }

  /* ------------------------------ pose ------------------------------ */
  function casesLibres(cle, x, y) {
    const m = CAT[cle];
    const out = [];
    for (let i = 0; i < m.w; i++) {
      for (let j = 0; j < m.h; j++) {
        const cx = x + i, cy = y + j;
        if (cx < 0 || cy < 0 || cx >= N || cy >= N) return null;
        if (G(cx, cy)) return null;
        out.push([cx, cy]);
      }
    }
    return out;
  }

  /* ------------------------- annuler / reinitialiser ------------------------ */
  function instantane() {
    return {
      bat: etat.batiments.map((b) => [b.cle, b.x, b.y, b.niv, b.total]),
      rails: [...etat.rails], argent: etat.argent, xp: etat.xp,
      niveau: etat.niveau, heure: etat.heure, t: Date.now(),
    };
  }
  function empilerHisto() {
    etat.histo.push(instantane());
    if (etat.histo.length > 25) etat.histo.shift();
  }
  function annuler() {
    if (!etat.histo.length) { bulle("Rien à annuler"); son(180, 0.1, "square", 0.05); return; }
    const d = etat.histo.pop();
    charger(d, true);
    construireDock(); majHud(); fermerInfo(); sauver();
    bulle("Annulé");
    son(320, 0.1, "triangle", 0.06);
  }
  function reinitialiser() {
    if (!etat.confirmeReset) {
      etat.confirmeReset = true;
      bulle("Touche encore pour tout effacer");
      son(200, 0.12, "square", 0.06);
      setTimeout(() => { etat.confirmeReset = false; }, 3200);
      return;
    }
    etat.confirmeReset = false;
    etat.batiments = []; etat.grille.fill(null); etat.rails = new Set();
    etat.train = null; etat.histo = []; etat.argent = 2500; etat.xp = 0;
    etat.niveau = 1; etat.vague = 0; etat.heure = 8; etat.selection = null;
    etat.voitures.length = 0; etat.pietons.length = 0; etat.camions.length = 0;
    try { localStorage.removeItem(SAVE); } catch (e) {}
    recalculer(); construireDock(); majHud(); fermerInfo(); majTrain();
    bulle("Ville réinitialisée");
    son(240, 0.2, "sine", 0.08);
  }

  function peutPoser(cle, x, y) {
    const m = CAT[cle];
    if (cle === "sable") {
      if (x < 0 || y < 0 || x >= N || y >= N) return "Hors de la ville";
      if (etat.sable.has(x + "," + y)) return "Il y a déjà du sable";
      if (G(x, y)) return "Case occupée";
      if (typeSol(x, y) === 2) return "Le sable ne se pose pas sur l'eau";
      return null;
    }
    if (cle === "viaduc") {
      if (x < 0 || y < 0 || x >= N || y >= N) return "Hors de la ville";
      if (etat.viaducs.has(x + "," + y)) return "Un viaduc est déjà là";
      const dessous = G(x, y);
      if (!dessous || (dessous.cle !== "route" && dessous.cle !== "rondPoint" && dessous.cle !== "pont"))
        return "Le viaduc se pose au-dessus d'une route : trace la route d'abord";
      return null;
    }
    if (cle === "canal") {
      if (x < 0 || y < 0 || x >= N || y >= N) return "Hors de la ville";
      if (etat.eau.has(x + "," + y)) return "Il y a deja de l'eau";
      if (G(x, y)) return "Case occupée";
      if (typeSol(x, y) === 2) return "C'est deja la mer";
      return null;
    }
    if (cle === "rail") {
      if (x < 0 || y < 0 || x >= N || y >= N) return "Hors de la ville";
      if (etat.rails.has(x + "," + y)) return "Rail déjà posé";
      const ty = typeSol(x, y);
      if (ty === 2) return "Pas de rail sur l'eau";
      if (ty === 1) return "Pas de rail sur la plage";
      return null;
    }
    const cases = casesLibres(cle, x, y);
    if (!cases) return "Case occupée";
    // contrôle du sol
    let eau = 0, plage = 0, terre = 0;
    for (const [cx, cy] of cases) {
      const ty = typeSol(cx, cy);
      if (ty === 2) eau++; else if (ty === 1) plage++; else terre++;
    }
    if (cle === "pont") {
      if (eau === 0 && plage === 0) return "Le pont se pose sur l'eau";
      return null;
    }
    if (m.mer) {
      if (eau + plage < cases.length) return "À poser sur l'eau, près de la côte";
      if (eau === 0) return "Il faut toucher l'eau";
      return null;
    }
    if (m.plage) {
      if (plage !== cases.length) return "À poser sur la plage";
      return null;
    }
    if (eau > 0) return "On ne construit pas sur l'eau";
    if (plage > 0 && cle !== "route") return "La plage est réservée aux loisirs";
    if (["route", "rail", "rondPoint", "trottoir"].indexOf(cle) >= 0) return null;
    // les bâtiments doivent toucher une route ou un rail
    let ok = false;
    for (const [cx, cy] of cases) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const v = G(cx + dx, cy + dy);
        if (v && (v.cle === "route" || v.cle === "rondPoint" || v.cle === "rail" || v.cle === "trottoir")) { ok = true; break; }
      }
      if (ok) break;
    }
    if (!ok) return "Il faut une route à côté";
    return null;
  }

  function poser(cle, x, y, silence) {
    const m = CAT[cle];
    if (m.niv > etat.niveau) { if (!silence) bulle("Débloqué au niveau " + m.niv); return false; }
    const refus = peutPoser(cle, x, y);
    if (refus) { if (!silence) { bulle(refus); son(180, 0.12, "square", 0.05); } return false; }
    empilerHisto();
    if (etat.argent < m.cout) { etat.histo.pop(); if (!silence) { bulle("Il te manque " + fmt(m.cout - etat.argent)); son(180, 0.12, "square", 0.05); } return false; }
    etat.argent -= m.cout;
    if (cle === "sable") {
      etat.sable.add(x + "," + y);
      regenererSol();
      son(300, 0.1, "sine", 0.04);
      etat.modifie = true; sauver();
      const ps = iso(x, y);
      flottant("-" + fmt(m.cout), ps.x, ps.y - 10, "#ffd2da");
      return true;
    }
    if (cle === "viaduc") {
      etat.viaducs.add(x + "," + y);
      majTraficHaut();
      son(360, 0.12, "sine", 0.05);
      etat.modifie = true; sauver();
      const pv = iso(x, y);
      flottant("-" + fmt(m.cout), pv.x, pv.y - 10, "#ffd2da");
      return true;
    }
    if (cle === "canal") {
      etat.eau.add(x + "," + y);
      regenererSol();
      son(420, 0.12, "sine", 0.05);
      etat.modifie = true; sauver();
      const pc = iso(x, y);
      flottant("-" + fmt(m.cout), pc.x, pc.y - 10, "#ffd2da");
      return true;
    }
    if (cle === "rail") {
      etat.rails.add(x + "," + y);
      etat.argentLock = 0;
      recalculer();
      son(300, 0.06, "square", 0.04);
      etat.modifie = true;
      const pr = iso(x, y);
      flottant("-" + fmt(m.cout), pr.x, pr.y - 10, "#ffd2da");
      majTrain();
      return true;
    }
    const b = { cle, niv: 1, x, y, w: m.w, h: m.h, nee: etat.temps, total: m.cout };
    for (const [cx, cy] of casesDe(b)) etat.grille[cy * N + cx] = b;
    etat.batiments.push(b);
    gagnerXp(Math.max(2, Math.round(m.cout / 18)));
    recalculer();
    son(m.h > 1 ? 360 : 520, 0.09, "triangle", 0.07);
    etat.modifie = true;
    const p = iso(x + m.w / 2, y + m.h / 2);
    flottant("-" + fmt(m.cout), p.x, p.y - 10, "#ffd2da");
    if (cle === "rail") majTrain();
    return true;
  }

  function retirerSable(x, y) {
    const k = x + "," + y;
    if (!etat.sable.has(k)) return;
    empilerHisto();
    etat.sable.delete(k);
    etat.argent += Math.round(CAT.sable.cout * 0.5);
    regenererSol(); etat.modifie = true; sauver();
    const p = iso(x, y);
    flottant("+" + fmt(Math.round(CAT.sable.cout * 0.5)), p.x, p.y - 10, "#9fe0a8");
  }

  function retirerViaduc(x, y) {
    const k = x + "," + y;
    if (!etat.viaducs.has(k)) return;
    empilerHisto();
    etat.viaducs.delete(k);
    etat.argent += Math.round(CAT.viaduc.cout * 0.5);
    majTraficHaut(); etat.modifie = true; sauver();
    const p = iso(x, y);
    flottant("+" + fmt(Math.round(CAT.viaduc.cout * 0.5)), p.x, p.y - 10, "#9fe0a8");
  }

  function retirerEau(x, y) {
    const k = x + "," + y;
    if (!etat.eau.has(k)) return;
    empilerHisto();
    etat.eau.delete(k);
    etat.argent += Math.round(CAT.canal.cout * 0.5);
    regenererSol(); etat.modifie = true; sauver();
    const p = iso(x, y);
    flottant("+" + fmt(Math.round(CAT.canal.cout * 0.5)), p.x, p.y - 10, "#9fe0a8");
  }

  function retirerRail(x, y) {
    const k = x + "," + y;
    if (!etat.rails.has(k)) return;
    empilerHisto();
    etat.rails.delete(k);
    etat.argent += Math.round(CAT.rail.cout * 0.5);
    majTrain(); recalculer(); etat.modifie = true; sauver();
    const p = iso(x, y);
    flottant("+" + fmt(Math.round(CAT.rail.cout * 0.5)), p.x, p.y - 10, "#9fe0a8");
    son(300, 0.1, "square", 0.05);
  }

  function demolir(b) {
    empilerHisto();
    if (b.cle === "rail") {
      etat.rails.delete(b.x + "," + b.y);
      etat.argent += Math.round(CAT.rail.cout * 0.5);
      majTrain(); recalculer(); etat.modifie = true;
      return;
    }
    etat.argent += Math.round(b.total * 0.5);
    for (const [cx, cy] of casesDe(b)) etat.grille[cy * N + cx] = null;
    etat.batiments = etat.batiments.filter((x) => x !== b);
    if (etat.selection === b) fermerInfo();
    if (b.cle === "rail") majTrain();
    recalculer();
    son(120, 0.18, "sawtooth", 0.07);
    etat.modifie = true;
    sauver();
    const p = iso(b.x + (b.w - 1) / 2, b.y + (b.h - 1) / 2);
    flottant("+" + fmt(b.total * 0.5), p.x, p.y - 10, "#9fe0a8");
  }


  /* ------------------------------ alertes et secours ------------------------------ */
  const ALERTES = {
    braquage: { nom: "Braquage", ico: "🥷", unite: "police", duree: 60, gain: 190 },
    vol: { nom: "Vol", ico: "🕵️", unite: "police", duree: 55, gain: 130 },
    incendie: { nom: "Incendie", ico: "🔥", unite: "pompier", duree: 48, gain: 280 },
    accident: { nom: "Accident", ico: "🚑", unite: "ambulance", duree: 42, gain: 210 },
  };
  const VOIES = ["route", "trottoir", "rondPoint", "pont", "rail"];

  function aBatiment(cle) { return etat.batiments.some((b) => b.cle === cle); }

  function majAlertes(dt) {
    if (etat.ecran !== "jeu") return;
    for (const a of etat.alertes) { a.t += dt; }
    // une alerte non traitee finit par couter cher
    for (const a of etat.alertes) {
      if (!a.envoyee && a.t > a.duree) {
        a.t = 0; a.envoyee = true; a.echec = true;
        etat.bonheur = clamp(etat.bonheur - 3, 0, 100);
        bulle("Alerte non traitée : " + ALERTES[a.type].nom + " (-3 bonheur)");
      }
    }
    etat.alertes = etat.alertes.filter((a) => !a.fini);
    if (etat.alertes.length >= 2) return;
    etat.prochaineAlerte -= dt;
    if (etat.prochaineAlerte > 0) return;
    etat.prochaineAlerte = 24 + Math.random() * 22;

    const possibles = [];
    if (aBatiment("commissariat")) possibles.push("braquage", "vol");
    if (aBatiment("pompiers")) possibles.push("incendie");
    if (aBatiment("hopital")) possibles.push("accident");
    if (!possibles.length) return;
    const cibles = etat.batiments.filter((b) => VOIES.indexOf(b.cle) < 0);
    if (!cibles.length) return;
    const type = possibles[(Math.random() * possibles.length) | 0];
    const c = cibles[(Math.random() * cibles.length) | 0];
    etat.alertes.push({ type, x: c.x, y: c.y, t: 0, duree: ALERTES[type].duree, unite: ALERTES[type].unite, envoyee: false });
    son(880, 0.18, "square", 0.05);
  }

  function uniteDispo(type) {
    const u = etat.unites.find((x) => x.type === type && !x.mission);
    return u || null;
  }

  function deployer() {
    const a = etat.alertes.find((x) => !x.envoyee) || etat.alertes[0];
    if (!a) { bulle("Aucune alerte en cours"); return; }
    const u = uniteDispo(a.unite);
    if (!u) { bulle("Aucune unité disponible : construis le bâtiment adapté"); return; }
    a.envoyee = true;
    u.mission = a;
    u.gx = u.x; u.gy = u.y;
    u.tx = a.x; u.ty = a.y;
    u.sirene = 1;
    son(620, 0.22, "sawtooth", 0.07);
    bulle(ALERTES[a.type].nom + " : unité déployée 🚨");
  }

  function majUnites(dt) {
    // patrouilles : police et pompiers dans les rues des qu'ils existent
    const veut = [];
    if (aBatiment("commissariat")) veut.push("police");
    if (aBatiment("pompiers")) veut.push("pompier");
    if (aBatiment("hopital")) veut.push("ambulance");
    for (const t of veut) {
      if (!etat.unites.some((u) => u.type === t)) {
        // depart depuis le batiment d'origine
        const src = etat.batiments.find((b) => b.cle === (t === "police" ? "commissariat" : t === "pompier" ? "pompiers" : "hopital"));
        if (src) etat.unites.push({ type: t, x: src.x, y: src.y, gx: src.x, gy: src.y, tx: src.x, ty: src.y, t: 0, mission: null, sirene: 0, ang: 0 });
      }
    }
    for (const u of etat.unites) {
      if (u.mission) {
        const a = u.mission;
        const d = Math.hypot(a.x - u.gx, a.y - u.gy);
        if (d > 0.25) {
          const v = dt * 7.5;
          const ang = Math.atan2(a.y - u.gy, a.x - u.gx);
          u.gx += Math.cos(ang) * Math.min(v, d);
          u.gy += Math.sin(ang) * Math.min(v, d);
          u.ang = ang;
          u.sirene = 1;
        } else {
          // sur place : on eteint le sinistre
          u.intervient = (u.intervient || 0) + dt;
          u.sirene = 0.6;
          if (u.intervient > 1.8) {
            a.fini = true;
            etat.alerteResolue = { type: a.type, x: a.x, y: a.y, t: 0 };
            const g = ALERTES[a.type].gain;
            etat.argent += g;
            etat.interventions += 1;
            gagnerXp(8);
            const p = iso(a.x + 0.5, a.y + 0.5);
            flottant("+" + fmt(g), p.x, p.y - 16, "#9fe0a8");
            bulle("Menace gérée : " + ALERTES[a.type].nom + " ✔️ Retour au calme");
            son(520, 0.2, "triangle", 0.07);
            u.mission = null; u.intervient = 0; u.sirene = 0;
            etat.calme = 4;
            etat.modifie = true; sauver();
          }
        }
      } else {
        // patrouille : avance au hasard sur les rues avoisinantes
        u.sirene = Math.max(0, u.sirene - dt);
        u.pat = (u.pat || 0) - dt;
        if (u.pat <= 0) {
          u.pat = 2.5 + Math.random() * 3;
          const rs = etat.batiments.filter((b) => b.cle === "route" || b.cle === "rondPoint");
          if (rs.length) {
            const r = rs[(Math.random() * rs.length) | 0];
            u.tx = r.x; u.ty = r.y;
          }
        }
        const dx = u.tx - u.gx, dy = u.ty - u.gy;
        const d = Math.hypot(dx, dy);
        if (d > 0.15) {
          const v = dt * 3.2;
          u.ang = Math.atan2(dy, dx);
          u.gx += (dx / d) * Math.min(v, d);
          u.gy += (dy / d) * Math.min(v, d);
          if (Math.random() < dt * 0.35) u.sirene = 1.2;
        }
      }
      u.t += dt;
    }
    if (etat.alerteResolue) etat.alerteResolue.t += dt;
    if (etat.calme > 0) etat.calme -= dt;
  }

  function majBanniereAlerte() {
    const zone = $("#alertes");
    if (!zone) return;
    const a = etat.alertes.filter((x) => !x.fini)[0];
    if (!a || etat.ecran !== "jeu") { zone.classList.add("cache"); return; }
    zone.classList.remove("cache");
    $("#alerte-ico").textContent = ALERTES[a.type].ico;
    $("#alerte-txt").textContent = ALERTES[a.type].nom + " · " + Math.max(0, Math.ceil(a.duree - a.t)) + "s";
    $("#btn-deployer").textContent = a.envoyee ? "En route…" : "Déployer";
    $("#btn-deployer").disabled = !!a.envoyee;
  }


  /* ------------------------------ viaducs ------------------------------ */
  const HAUT = 18; // hauteur du tablier au-dessus de la route

  function cheminViaduc() {
    const pts = [...etat.viaducs].map((k) => {
      const [x, y] = k.split(",").map(Number);
      return { x, y };
    });
    if (pts.length < 2) return pts;
    // ordre continu : on part du premier et on avance de proche en proche
    const reste = pts.slice(1);
    const ordre = [pts[0]];
    while (reste.length) {
      const d = ordre[ordre.length - 1];
      let bi = 0, bd = 1e9;
      for (let i = 0; i < reste.length; i++) {
        const dd = Math.abs(reste[i].x - d.x) + Math.abs(reste[i].y - d.y);
        if (dd < bd) { bd = dd; bi = i; }
      }
      if (bd > 6) break;
      ordre.push(reste.splice(bi, 1)[0]);
    }
    return ordre;
  }

  function majTraficHaut() {
    const ch = cheminViaduc();
    etat.cheminHaut = ch;
    if (ch.length < 2) { etat.traficHaut = []; return; }
    const n = Math.min(5, Math.max(1, Math.floor(ch.length / 2)));
    while (etat.traficHaut.length > n) etat.traficHaut.pop();
    while (etat.traficHaut.length < n) {
      etat.traficHaut.push({
        p: Math.random() * (ch.length - 1),
        sens: Math.random() < 0.5 ? 1 : -1,
        v: 1.1 + Math.random() * 0.8,
        coul: ["#e8e2d2", "#2f6fd0", "#c8302f", "#f5cf1b", "#2a9d5c", "#8a8f98"][(Math.random() * 6) | 0],
      });
    }
  }

  function majTraficHautBouge(dt) {
    const ch = etat.cheminHaut;
    if (!ch || ch.length < 2) return;
    for (const v of etat.traficHaut) {
      v.p += dt * v.v * v.sens;
      if (v.p >= ch.length - 1) { v.p = ch.length - 1; v.sens = -1; }
      if (v.p <= 0) { v.p = 0; v.sens = 1; }
    }
  }

  function dessinerViaducs() {
    const ch = etat.cheminHaut || cheminViaduc();
    if (!ch.length) return;
    // piliers
    for (const c of ch) {
      const p = iso(c.x, c.y);
      ctx.fillStyle = "#8d8f8a";
      ctx.fillRect(p.x - 3, p.y - HAUT + 6, 6, HAUT);
      ctx.fillStyle = "#a7a9a3";
      ctx.fillRect(p.x - 3, p.y - HAUT + 6, 2.5, HAUT);
    }
    // tablier continu
    for (let i = 0; i < ch.length - 1; i++) {
      const a = iso(ch[i].x, ch[i].y), b = iso(ch[i + 1].x, ch[i + 1].y);
      ctx.save();
      ctx.translate(0, -HAUT);
      // ombre portee sur la route en dessous
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 15;
      ctx.beginPath(); ctx.moveTo(a.x, a.y + HAUT); ctx.lineTo(b.x, b.y + HAUT); ctx.stroke();
      // tablier
      ctx.strokeStyle = "#b9bbb3";
      ctx.lineWidth = 13;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.strokeStyle = "#d6d8d0";
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      // chaussee
      ctx.strokeStyle = "#4c525c";
      ctx.lineWidth = 6.5;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      // ligne centrale
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.setLineDash([]);
      // garde-fous
      ctx.strokeStyle = "#e9ebe3"; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(a.x, a.y - 4); ctx.lineTo(b.x, b.y - 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(a.x, a.y + 4); ctx.lineTo(b.x, b.y + 4); ctx.stroke();
      ctx.restore();
    }
    // trafic du niveau superieur
    for (const v of etat.traficHaut) {
      const i = Math.min(ch.length - 2, Math.max(0, Math.floor(v.p)));
      const f = v.p - i;
      const a = iso(ch[i].x, ch[i].y), b = iso(ch[i + 1].x, ch[i + 1].y);
      const x = a.x + (b.x - a.x) * f;
      const y = a.y + (b.y - a.y) * f - HAUT - 2;
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath(); ctx.ellipse(x, y + 3, 6, 2.4, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = v.coul;
      ctx.fillRect(x - 5.5, y - 4, 11, 5);
      ctx.fillStyle = "#22303c";
      ctx.fillRect(x - 3, y - 3.4, 3, 2.4); ctx.fillRect(x + 1, y - 3.4, 3, 2.4);
    }
  }

  /* ------------------------------ vie des lieux et trafic aerien ------------------------------ */
  const COUL_PARASOL = ["#e5484d", "#f5cf1b", "#009460", "#2f6fd0", "#f08a3c"];

  function graine(x, y) {
    let h = (x * 73856093) ^ (y * 19349663);
    h = (h ^ (h >>> 13)) * 1274126177;
    return Math.abs(h % 1000) / 1000;
  }

  // parasols et baigneurs sur le sable dessine
  function dessinerSable() {
    const cases = [...etat.sable];
    for (const k of cases) {
      const [x, y] = k.split(",").map(Number);
      const g = graine(x, y);
      if (g > 0.42) continue;                 // tous les sable ne portent pas un parasol
      if (G(x, y)) continue;                  // rien sur une case occupee
      const p = iso(x, y);
      const c = COUL_PARASOL[(g * 100) % COUL_PARASOL.length | 0];
      // mat
      ctx.strokeStyle = "#8a7250"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 2); ctx.lineTo(p.x, p.y - 13); ctx.stroke();
      // toile
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(p.x - 8, p.y - 12); ctx.lineTo(p.x + 8, p.y - 12);
      ctx.lineTo(p.x, p.y - 18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 12); ctx.lineTo(p.x + 8, p.y - 12); ctx.lineTo(p.x, p.y - 18); ctx.closePath(); ctx.fill();
      // serviette
      if (g < 0.2) {
        ctx.fillStyle = ["#ffe08a", "#ffb3c1", "#a8e0ff"][(g * 60) | 0 % 3];
        ctx.fillRect(p.x - 9, p.y + 1, 6, 2.6);
      }
    }
  }

  // nageurs dans la piscine
  function dessinerNageurs() {
    for (const b of etat.batiments) {
      if (b.cle !== "piscine") continue;
      const p = iso(b.x + (b.w - 1) / 2, b.y + (b.h - 1) / 2);
      for (let i = 0; i < 3; i++) {
        const a = etat.temps * (0.5 + i * 0.18) + i * 2.1;
        const x = p.x + Math.cos(a) * 9;
        const y = p.y - 4 + Math.sin(a) * 3.5;
        ctx.fillStyle = ["#ffd9a8", "#f0b98a", "#ffe4bc"][i];
        ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.283); ctx.fill();
        ctx.fillStyle = "#e5484d";
        ctx.beginPath(); ctx.arc(x, y - 1.6, 1.1, 0, 6.283); ctx.fill();
      }
    }
  }

  // bateaux qui remontent le canal jusqu'a la mer
  function majBateauxCanal(dt) {
    const cases = [...etat.eau].map((k) => { const [x, y] = k.split(",").map(Number); return { x, y }; });
    etat.cheminEau = cases;
    if (cases.length < 3) { etat.bateauxCanal = []; return; }
    // le canal communique-t-il avec la mer ?
    let toucheMer = false;
    for (const c of cases) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!etat.eau.has((c.x + dx) + "," + (c.y + dy)) && typeSol(c.x + dx, c.y + dy) === 2) toucheMer = true;
      }
    }
    etat.eauRelieMer = toucheMer;
    if (!etat.bateauxCanal) etat.bateauxCanal = [];
    const cible = Math.min(4, Math.max(1, Math.floor(cases.length / 5)));
    while (etat.bateauxCanal.length > cible) etat.bateauxCanal.pop();
    while (etat.bateauxCanal.length < cible) {
      etat.bateauxCanal.push({
        i: (Math.random() * cases.length) | 0, t: 0, sens: Math.random() < 0.5 ? 1 : -1,
        v: 0.5 + Math.random() * 0.5, coul: ["#f4f6f8", "#2f6fd0", "#c8302f", "#e8b23a"][(Math.random() * 4) | 0],
      });
    }
    for (const bt of etat.bateauxCanal) {
      bt.t += dt * bt.v;
      if (bt.t < 1) continue;
      bt.t = 0;
      bt.i += bt.sens;
      if (bt.i >= cases.length - 1 || bt.i <= 0) bt.sens *= -1;
    }
  }

  function dessinerBateauxCanal() {
    const ch = etat.cheminEau;
    if (!ch || ch.length < 2 || !etat.bateauxCanal) return;
    for (const bt of etat.bateauxCanal) {
      const a = ch[Math.max(0, Math.min(ch.length - 1, bt.i))];
      const b2 = ch[Math.max(0, Math.min(ch.length - 1, bt.i + bt.sens))] || a;
      const p = iso(a.x + (b2.x - a.x) * bt.t, a.y + (b2.y - a.y) * bt.t);
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath(); ctx.ellipse(0, 1, 8, 3, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = bt.coul;
      ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.lineTo(5, 4); ctx.lineTo(-5, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#f4f6f8"; ctx.fillRect(-2, -3, 4, 3);
      ctx.restore();
    }
  }

  // helicoptere qui survole la ville
  function majHelico(dt) {
    const a = etat.batiments.some((b) => b.cle === "heliport" || b.cle === "hopital");
    if (!a) { etat.helico = null; return; }
    if (!etat.helico) etat.helico = { a: Math.random() * 6.28, r: 6 + Math.random() * 6, alt: 90, t: 0 };
    const h = etat.helico;
    h.t += dt;
    h.a += dt * 0.26;
    h.gx = Math.floor(N / 2) + Math.cos(h.a) * h.r;
    h.gy = Math.floor(N / 2) + Math.sin(h.a) * h.r;
  }

  function dessinerHelico() {
    const h = etat.helico;
    if (!h) return;
    const p = iso(h.gx, h.gy);
    const y = p.y - h.alt;
    ctx.save(); ctx.translate(p.x, y);
    // ombre au sol
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath(); ctx.ellipse(0, h.alt, 7, 3, 0, 0, 6.283); ctx.fill();
    // rotor
    ctx.strokeStyle = "rgba(230,235,240,0.75)"; ctx.lineWidth = 1.6;
    const rl = 13 + Math.sin(etat.temps * 22) * 3;
    ctx.beginPath(); ctx.moveTo(-rl, -4); ctx.lineTo(rl, -4); ctx.stroke();
    // corps
    ctx.fillStyle = "#e9edf2";
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 3.6, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = "#2f6fd0"; ctx.fillRect(-5, -1, 4, 2);
    ctx.fillStyle = "#9aa4ad"; ctx.fillRect(6, -1, 6, 1.6);
    ctx.restore();
  }

  // lancement de fusee
  function majFusee(dt) {
    const site = etat.batiments.find((b) => b.cle === "fusee");
    if (!site) { etat.fusee = null; return; }
    if (!etat.fusee) etat.fusee = { t: 0, attente: 22 + Math.random() * 25 };
    const f = etat.fusee;
    if (f.t > 0) {
      f.t += dt;
      if (f.t > 4.5) { f.t = 0; f.attente = 26 + Math.random() * 28; }
      return;
    }
    f.attente -= dt;
    if (f.attente <= 0) { f.t = 0.01; son(180, 0.5, "sawtooth", 0.05); }
  }

  // collisions : rare, avec fumee et alerte
  function collisionVehicule(x, y) {
    const p = iso(x, y);
    etat.explosions = etat.explosions || [];
    etat.explosions.push({ x: p.x, y: p.y, t: 0 });
    son(90, 0.5, "sawtooth", 0.09);
    if (etat.alertes.length < 2 && aBatiment("hopital")) {
      etat.alertes.push({ type: "accident", x, y, t: 0, duree: ALERTES.accident.duree, unite: "ambulance", envoyee: false });
      bulle("Collision sur la route : ambulance demandée 🚑");
    }
  }

  function majExplosions(dt) {
    if (!etat.explosions) etat.explosions = [];
    for (const e of etat.explosions) e.t += dt;
    etat.explosions = etat.explosions.filter((e) => e.t < 1.6);
  }

  function dessinerExplosions() {
    for (const e of etat.explosions || []) {
      const u = e.t / 1.6;
      ctx.save(); ctx.translate(e.x, e.y);
      ctx.globalAlpha = 1 - u;
      ctx.fillStyle = "#f5a623";
      ctx.beginPath(); ctx.arc(0, -4, 4 + u * 16, 0, 6.283); ctx.fill();
      ctx.fillStyle = "rgba(90,90,90,0.8)";
      ctx.beginPath(); ctx.arc(0, -8 - u * 18, 3 + u * 10, 0, 6.283); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /* ------------------------------ économie ------------------------------ */
  function gagnerXp(n) {
    etat.xp += n;
    let besoin = XP_NIVEAU(etat.niveau);
    while (etat.xp >= besoin) {
      etat.xp -= besoin;
      etat.niveau += 1;
      etat.argent += 300 * etat.niveau;
      bulle("Niveau " + etat.niveau + " ! Bonus " + fmt(300 * etat.niveau) + " $");
      son(660, 0.2, "triangle", 0.1);
      setTimeout(() => son(880, 0.25, "triangle", 0.1), 130);
      construireDock();
      besoin = XP_NIVEAU(etat.niveau);
    }
  }
  const revenuBat = (b) => (CAT[b.cle].rev || 0) * (1 + (b.niv - 1) * 0.6);
  const coutAmelio = (b) => Math.round(CAT[b.cle].cout * 0.8 * b.niv);

  function recalculer() {
    let hab = 0, rev = 0, bonus = 0;
    for (const b of etat.batiments) {
      const m = CAT[b.cle];
      hab += (m.hab || 0) * (1 + (b.niv - 1) * 0.5);
      bonus += (m.bonheur || 0);
      rev += revenuBat(b);
    }
    etat.habitants = Math.round(hab);
    const besoin = Math.max(1, etat.habitants / 25);
    const ratio = clamp(bonus / besoin, 0, 1.4);
    etat.bonheur = etat.habitants === 0 ? 100 : Math.round(clamp(55 + ratio * 45, 40, 100));
    etat.revenuSec = rev * (0.6 + (etat.bonheur / 100) * 0.4);
  }

  /* ------------------------------ entités animées ------------------------------ */
  const routes = () => etat.batiments.filter((b) => b.cle === "route" || b.cle === "rondPoint" || b.cle === "pont");
  const rails = () => [...etat.rails].map((k) => { const [x, y] = k.split(",").map(Number); return { x, y }; });
  const voisinRoute = (x, y) => { const v = G(x, y); return v && (v.cle === "route" || v.cle === "rondPoint" || v.cle === "pont"); };
  const trottoirs = () => etat.batiments.filter((b) => b.cle === "trottoir");
  const voisinTrottoir = (x, y) => { const v = G(x, y); return v && v.cle === "trottoir"; };
  const voisinRail = (x, y) => etat.rails.has(x + "," + y);

  function majVoitures(dt) {
    const rs = routes();
    const cible = clamp(Math.floor(rs.length / 2.2), 0, 34);
    while (etat.voitures.length < cible) {
      const r = rs[(Math.random() * rs.length) | 0];
      if (!r) break;
      etat.voitures.push({
        gx: r.x, gy: r.y, tx: r.x, ty: r.y, t: 1, v: 0.9 + Math.random() * 0.9, px: r.x, py: r.y,
        coul: ["#e8372f", "#f5cf1b", "#3b8fb8", "#f4f4f0", "#2f9a58", "#ef7f2e", "#222"][(Math.random() * 7) | 0],
      });
    }
    while (etat.voitures.length > cible + 2) etat.voitures.pop();
    for (const v of etat.voitures) {
      v.t += dt * v.v * 1.5;
      if (v.t >= 1) {
        v.gx = v.tx; v.gy = v.ty; v.t = 0;
        if (!voisinRoute(v.gx, v.gy)) {
          const r = rs[(Math.random() * rs.length) | 0];
          if (r) { v.gx = r.x; v.gy = r.y; } else continue;
        }
        const opts = [];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (voisinRoute(v.gx + dx, v.gy + dy)) opts.push([v.gx + dx, v.gy + dy]);
        if (opts.length) {
          const ahead = opts.filter(([x, y]) => !(x === v.px && y === v.py));
          const pool = ahead.length ? ahead : opts;
          const pick = pool[(Math.random() * pool.length) | 0];
          v.px = v.gx; v.py = v.gy;
          v.tx = pick[0]; v.ty = pick[1];
        }
      }
    }
  }

  // piétons : marcheurs le long des rues, joueurs dans les parcs
  // collisions rares entre vehicules sur une meme case
  let chronoCollision = 0;
  function verifierCollisions(dt) {
    chronoCollision -= dt;
    if (chronoCollision > 0) return;
    chronoCollision = 1.5;
    if (etat.voitures.length < 6) return;
    if (Math.random() > 0.06) return;
    const vus = new Map();
    for (const v of etat.voitures) {
      const k = v.gx + "," + v.gy;
      if (vus.has(k)) { collisionVehicule(v.gx, v.gy); return; }
      vus.set(k, v);
    }
  }

  function majPietons(dt) {
    const rs = trottoirs();
    const parcs = etat.batiments.filter((b) => ["parc", "place", "monument", "stade", "marcheC", "plage_b", "piscine", "basket", "mosquee", "eglise", "jardin"].indexOf(b.cle) >= 0);
    const interets = etat.batiments.filter((b) => ["monument", "stade", "hotel", "aeroport", "port", "plage_b", "mosquee", "eglise", "marcheC", "jardin"].indexOf(b.cle) >= 0);

    // --- touristes : devant les curiosites, jamais dans les murs ---
    const cibleT = clamp(interets.length * 2, 0, 20);
    let touristes = etat.pietons.filter((p) => p.mode === "touriste").length;
    while (touristes < cibleT && interets.length) {
      const b = interets[(Math.random() * interets.length) | 0];
      const px = b.x + (Math.random() - 0.5) * (b.w + 1);
      const py = b.y + b.h - 0.5 + Math.random() * 1.2;   // devant l'entree
      etat.pietons.push({ mode: "touriste", base: { x: px, y: py }, gx: px, gy: py, t: Math.random() * 3, ph: Math.random() * 6.28, coul: teintePerso(), cote: 1 });
      touristes++;
    }

    // --- jardiniers qui entretiennent les jardins ---
    const jardins = etat.batiments.filter((b) => b.cle === "jardin" || b.cle === "roseraie");
    const cibleJa = Math.min(jardins.length, 14);
    let jardiniers = etat.pietons.filter((p) => p.mode === "jardinier").length;
    while (jardiniers < cibleJa && jardins.length) {
      const b = jardins[jardiniers % jardins.length];
      const px = b.x + (Math.random() - 0.5) * (b.w + 1.4);
      const py = b.y + b.h - 0.2 + Math.random() * 0.8;
      etat.pietons.push({ mode: "jardinier", base: { x: b.x + (b.w - 1) / 2, y: b.y + (b.h - 1) / 2 },
        gx: px, gy: py, t: Math.random() * 3, ph: Math.random() * 6.28, coul: "#3f6b3a", cote: 1 });
      jardiniers++;
    }

    // --- gens qui profitent des lieux de loisirs, poses DEVANT le batiment ---
    const cibleJ = clamp(parcs.length * 3, 0, 46);
    let joueurs = etat.pietons.filter((p) => p.mode === "joue").length;
    while (joueurs < cibleJ && parcs.length) {
      const b = parcs[(Math.random() * parcs.length) | 0];
      const px = b.x + (Math.random() - 0.5) * (b.w + 1.2);
      const py = b.y + b.h - 0.35 + Math.random() * 0.9;
      const p = { mode: "joue", gx: px, gy: py, t: Math.random() * 5, ph: Math.random() * 6.28, coul: teintePerso(), base: { x: px, y: py }, loisir: b.cle };
      etat.pietons.push(p);
      joueurs++;
    }

    // --- marcheurs : uniquement sur les trottoirs, et leur nombre suit le reseau pieton ---
    const cible = clamp(Math.floor(rs.length * 1.8) + parcs.length * 2, 0, 90);
    const marcheurs = () => etat.pietons.filter((p) => p.mode === "marche").length;
    let garde = 0;
    while (marcheurs() < cible && rs.length && garde < 60) {
      garde++;
      const r = rs[(Math.random() * rs.length) | 0];
      etat.pietons.push({ mode: "marche", gx: r.x, gy: r.y, tx: r.x, ty: r.y, t: 1, v: 0.25 + Math.random() * 0.3, ph: Math.random() * 6.28, coul: teintePerso(), px: r.x, py: r.y, cote: Math.random() < 0.5 ? -1 : 1 });
    }
    if (etat.pietons.length > cible + cibleT + cibleJ + 20) etat.pietons.length = cible + cibleT + cibleJ + 20;

    for (const p of etat.pietons) {
      p.ph += dt * (p.mode === "marche" ? 7 : 3);
      if (p.mode === "jardinier") {
        p.t += dt;
        const a = p.t * 0.45 + p.ph;
        p.gx = p.base.x + Math.cos(a) * 1.15;
        p.gy = p.base.y + Math.sin(a) * 0.75;
        continue;
      }
      if (p.mode === "touriste") {
        p.t += dt;
        if (p.t > 3.5) {
          p.t = 0;
          p.base.x += (Math.random() - 0.5) * 1.6;
          p.base.y += (Math.random() - 0.5) * 1.6;
        }
        p.gx += (p.base.x - p.gx) * dt * 1.4;
        p.gy += (p.base.y - p.gy) * dt * 1.4;
        continue;
      }
      if (p.mode === "joue") {
        p.t += dt;
        if (p.t > 6) { p.t = 0; p.base.x += (Math.random() - 0.5) * 0.7; p.base.y += (Math.random() - 0.5) * 0.4; }
        p.gx = p.base.x; p.gy = p.base.y;
        continue;
      }
      p.t += dt * p.v;
      if (p.t >= 1) {
        p.gx = p.tx; p.gy = p.ty; p.t = 0;
        if (!voisinTrottoir(p.gx, p.gy)) { p.mode = "fin"; continue; }
        const opts = [];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (voisinTrottoir(p.gx + dx, p.gy + dy)) opts.push([p.gx + dx, p.gy + dy]);
        if (!opts.length) { p.mode = "fin"; continue; }
        const ahead = opts.filter(([x, y]) => !(x === p.px && y === p.py));
        const pool = ahead.length ? ahead : opts;
        const pick = pool[(Math.random() * pool.length) | 0];
        p.px = p.gx; p.py = p.gy; p.tx = pick[0]; p.ty = pick[1];
      }
    }
    etat.pietons = etat.pietons.filter((p) => p.mode !== "fin");
  }
  const teintePerso = () => ["#e8372f", "#f5cf1b", "#2f9a58", "#3b8fb8", "#ef7f2e", "#8e44ad", "#f4f4f0", "#2c3e50"][(Math.random() * 8) | 0];

  // camions miniers : mine -> port
  function casesRouteAdjacentes(b) {
    const out = [];
    for (let i = 0; i < b.w; i++) {
      for (let j = 0; j < b.h; j++) {
        const cx = b.x + i, cy = b.y + j;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (voisinRoute(cx + dx, cy + dy)) out.push([cx + dx, cy + dy]);
      }
    }
    return out;
  }

  function bfsRoute(a, b) {
    const start = casesRouteAdjacentes(a), goal = casesRouteAdjacentes(b);
    if (!start.length || !goal.length) return null;
    const gset = new Set(goal.map(([x, y]) => x + "," + y));
    const q = [], prev = new Map();
    for (const s of start) { const k = s[0] + "," + s[1]; q.push(s); prev.set(k, null); }
    let head = 0, found = null;
    while (head < q.length && q.length < 6000) {
      const [x, y] = q[head++];
      const k = x + "," + y;
      if (gset.has(k)) { found = k; break; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, nk = nx + "," + ny;
        if (!voisinRoute(nx, ny) || prev.has(nk)) continue;
        prev.set(nk, k);
        q.push([nx, ny]);
      }
    }
    if (!found) return null;
    const path = [];
    let cur = found;
    while (cur) { const [x, y] = cur.split(",").map(Number); path.push({ x, y }); cur = prev.get(cur); }
    return path.reverse();
  }

  function majCamions(dt) {
    const mines = etat.batiments.filter((b) => b.cle === "mine");
    const ports = etat.batiments.filter((b) => b.cle === "port");
    if (!mines.length || !ports.length) { if (etat.camions.length) etat.camions.length = 0; return; }
    const cible = clamp(mines.length * 2, 1, 8);
    while (etat.camions.length < cible) {
      const mine = mines[(Math.random() * mines.length) | 0];
      const port = ports[(Math.random() * ports.length) | 0];
      const aller = bfsRoute(mine, port);
      if (!aller) { etat.camions.push({ bloque: true, x: mine.x, y: mine.y }); break; }
      etat.camions.push({
        etape: 0, sens: 1, aller, retour: aller.slice().reverse(), t: 0, v: 0.55 + Math.random() * 0.25,
        charge: false, mine, port, px: aller[0].x, py: aller[0].y, tx: aller[0].x, ty: aller[0].y,
      });
    }
    etat.camions = etat.camions.filter((c) => !c.bloque);
    for (const c of etat.camions) {
      const chemin = c.sens > 0 ? c.aller : c.retour;
      if (!chemin || chemin.length < 2) continue;
      c.t += dt * c.v * 3.6;
      if (c.t >= 1) {
        c.t = 0;
        c.etape += 1;
        if (c.etape >= chemin.length) {
          // livraison
          c.sens *= -1; c.etape = 1;
          if (c.sens < 0) {
            const gain = (CAT.mine.minerai || 20) * 1.6;
            etat.argent += gain;
            etat.livraisons += 1;
            const p = iso(c.port.x + 1, c.port.y + 1);
            flottant("+" + fmt(gain) + " $", p.x, p.y - 20, "#ffe680");
            son(520, 0.12, "sine", 0.05);
          }
          continue;
        }
      }
      const a = chemin[Math.max(0, c.etape - 1)], b = chemin[Math.min(chemin.length - 1, c.etape)];
      c.px = a.x; c.py = a.y; c.tx = b.x; c.ty = b.y;
    }
  }

  // train : se forme quand le réseau de rails est assez long
  // Itineraire continu sur les rails : accepte les 8 directions (diagonales comprises)
  // et relie aussi les rails voisins a moins de 1,5 case, comme on les trace au doigt.
  function construireItineraire() {
    const rs = rails();
    if (rs.length < 2) return [];
    const k = (p) => p.x + "," + p.y;
    const parCle = new Map(rs.map((p) => [k(p), p]));
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

    const voisinsDe = (p) => {
      const out = [];
      for (const [dx, dy] of DIRS) {
        const q = parCle.get((p.x + dx) + "," + (p.y + dy));
        if (q) out.push(q);
      }
      // rattrapage : rails proches mais pas exactement adjacents
      if (!out.length) {
        for (const q of rs) {
          if (q === p) continue;
          if (Math.abs(q.x - p.x) <= 1.5 && Math.abs(q.y - p.y) <= 1.5) out.push(q);
        }
      }
      return out;
    };

    // le plus long chemin possible : on demarre sur un rail d'extremite (1 seul voisin)
    let depart = rs[0];
    for (const q of rs) if (voisinsDe(q).length === 1) { depart = q; break; }

    const vus = new Set();
    const ordre = [];
    let courant = depart;
    while (courant) {
      const cle = k(courant);
      if (vus.has(cle)) break;
      vus.add(cle); ordre.push(courant);
      const libres = voisinsDe(courant).filter((q) => !vus.has(k(q)));
      if (!libres.length) break;
      // on prefere garder la meme direction pour un trajet lineaire
      const dernier = ordre[ordre.length - 2];
      let pick = libres[0];
      if (dernier) {
        const dx = courant.x - dernier.x, dy = courant.y - dernier.y;
        const tout = libres.find((q) => q.x - courant.x === dx && q.y - courant.y === dy);
        if (tout) pick = tout;
      }
      courant = pick;
    }
    return ordre;
  }

  function majTrain() {
    const it = construireItineraire();
    etat.itineraire = it;
    if (it.length < 2) { etat.train = null; return; }
    if (!etat.train) {
      etat.train = { i: 0, t: 0, sens: 1, gx: it[0].x, gy: it[0].y, tx: it[1].x, ty: it[1].y, trace: [], wagons: 3, v: 1.1 };
    } else {
      // le reseau a change : on garde le train mais on le replace proprement
      if (etat.train.i >= it.length - 1) { etat.train.i = 0; etat.train.sens = 1; }
      etat.train.t = etat.train.t || 0;
    }
  }

  function majTrainBouge(dt) {
    const tr = etat.train;
    if (!tr) return;
    const it = etat.itineraire;
    if (!it || it.length < 2) { etat.train = null; return; }

    tr.t += dt * (tr.v || 1.1);
    while (tr.t >= 1) {
      tr.t -= 1;
      tr.i += tr.sens;
      if (tr.i >= it.length - 1) { tr.i = it.length - 1; tr.sens = -1; }
      if (tr.i <= 0) { tr.i = 0; tr.sens = 1; }
    }
    const a = it[tr.i];
    const b = it[Math.min(it.length - 1, tr.i + tr.sens)];
    if (!b) { tr.t = 0; return; }
    tr.gx = a.x; tr.gy = a.y; tr.tx = b.x; tr.ty = b.y;

    const fx = tr.gx + (tr.tx - tr.gx) * tr.t;
    const fy = tr.gy + (tr.ty - tr.gy) * tr.t;
    tr.trace.push({ x: fx, y: fy });
    if (tr.trace.length > 260) tr.trace.shift();
  }


  function majAvions(dt) {
    const aero = etat.batiments.filter((b) => b.cle === "aeroport");
    if (!aero.length) return;
    if (Math.random() < dt * 0.16 && etat.avions.length < 2) {
      const b = aero[(Math.random() * aero.length) | 0];
      const p = iso(b.x + (b.w - 1) / 2, b.y + (b.h - 1) / 2);
      etat.avions.push({ x: p.x - 40, y: p.y, vx: 95, vy: -14, t: 0, s: 1 });
    }
    for (const a of etat.avions) {
      a.t += dt; a.x += a.vx * dt; a.y += a.vy * dt; a.s = 1 + a.t * 0.12;
    }
    etat.avions = etat.avions.filter((a) => a.x < 1400 && a.y > -600);
  }

  function majMeteo(dt) {
    if (etat.nuages.length < 6) etat.nuages.push({ x: -700 + Math.random() * 1500, y: -320 + Math.random() * 700, v: 6 + Math.random() * 10, s: 0.7 + Math.random() * 1 });
    for (const n of etat.nuages) n.x += n.v * dt;
    etat.nuages = etat.nuages.filter((n) => n.x < 1200);
    if (etat.bateaux.length < 4) {
      const p = iso(N * 0.8 + Math.random() * 6, N * 0.9 + Math.random() * 6);
      etat.bateaux.push({ x: p.x, y: p.y, v: (Math.random() < 0.5 ? -1 : 1) * (7 + Math.random() * 7), c: ["#fff", "#e8372f", "#f5cf1b"][(Math.random() * 3) | 0] });
    }
    for (const b of etat.bateaux) { b.x += b.v * dt; b.y += b.v * dt * 0.5; }
    etat.bateaux = etat.bateaux.filter((b) => Math.abs(b.x) < 1500 && b.y < N * TH + 240 && b.y > 0);
  }

  /* ------------------------------ interface ------------------------------ */
  let bulleTimer = null;
  function bulle(txt) {
    const b = $("#bulle");
    if (!b) return;
    b.textContent = txt;
    b.classList.remove("cache");
    clearTimeout(bulleTimer);
    bulleTimer = setTimeout(() => b.classList.add("cache"), 2300);
  }
  function flottant(txt, x, y, col) { etat.flottants.push({ txt, x, y, t: 0, col }); }

  function majHud() {
    majBanniereAlerte();
    $("#h-niveau").textContent = etat.niveau;
    $("#h-hab").textContent = fmt(etat.habitants);
    $("#h-bonheur").textContent = etat.bonheur + "%";
    $("#h-argent").textContent = fmt(etat.argent);
    $("#h-revenu").textContent = "+" + etat.revenuSec.toFixed(1) + "/s";
    $("#h-xp").style.width = Math.round(100 * etat.xp / XP_NIVEAU(etat.niveau)) + "%";
    const hd = $("#h-heure");
    if (hd) hd.textContent = String(Math.floor(etat.heure)).padStart(2, "0") + "h";
    document.querySelectorAll(".bat").forEach((el) => {
      const m = CAT[el.dataset.cle];
      if (!m) return;
      el.classList.toggle("pauvre", etat.argent < m.cout && m.niv <= etat.niveau);
    });
  }

  function construireOnglets() {
    const box = $("#onglets");
    box.innerHTML = "";
    for (const [id, nom] of ONGLETS) {
      const b = document.createElement("button");
      b.className = "onglet" + (id === etat.onglet ? " actif" : "");
      b.textContent = nom;
      b.addEventListener("click", () => {
        etat.onglet = id;
        etat.choix = Object.keys(CAT).find((k) => CAT[k].onglet === id);
        etat.gomme = false;
        $("#btn-gomme").classList.remove("actif");
        construireOnglets(); construireDock();
      });
      box.appendChild(b);
    }
  }

  function vignette(cle) {
    const cv = document.createElement("canvas");
    cv.width = 120; cv.height = 84;
    const g = cv.getContext("2d");
    g.translate(60, 62);
    const m = CAT[cle];
    if (cle === "trottoir") {
      losange(g, 0, 0, TW * 0.9, TH * 0.9, "#b9b2a0");
      g.strokeStyle = "rgba(120,114,100,0.85)";
      g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(-14, -7); g.lineTo(14, 7); g.stroke();
      g.beginPath(); g.moveTo(-14, 7); g.lineTo(14, -7); g.stroke();
    } else if (cle === "route" || cle === "rail") {
      losange(g, 0, 0, TW * 0.9, TH * 0.9, cle === "rail" ? "#6f6656" : "#4c525c");
      g.strokeStyle = cle === "rail" ? "#b9c0c8" : "rgba(240,240,230,0.7)";
      g.lineWidth = 2; g.setLineDash(cle === "rail" ? [] : [5, 4]);
      g.beginPath(); g.moveTo(-18, -9); g.lineTo(18, 9); g.stroke(); g.setLineDash([]);
    } else {
      const sc = (m.h > 6 ? 0.5 : m.h > 2 ? 0.62 : 0.8) * (m.w > 1 ? 0.7 : 1);
      g.scale(sc, sc);
      g.translate(0, m.h > 6 ? 16 : m.h > 2 ? 6 : 0);
      const sauve = etat.nuit; etat.nuit = 0;
      dessinerBatiment(g, cle, 1, 0, m.w, m.h);
      etat.nuit = sauve;
    }
    return cv;
  }

  function construireDock() {
    const box = $("#batiments");
    box.innerHTML = "";
    for (const cle of Object.keys(CAT)) {
      const m = CAT[cle];
      if (m.onglet !== etat.onglet) continue;
      const el = document.createElement("div");
      el.className = "bat" + (cle === etat.choix && !etat.gomme ? " choisi" : "") + (m.niv > etat.niveau ? " verrou" : "");
      el.dataset.cle = cle;
      el.appendChild(vignette(cle));
      const nom = document.createElement("div"); nom.className = "nom"; nom.textContent = m.nom;
      const prix = document.createElement("div"); prix.className = "prix";
      prix.textContent = m.niv > etat.niveau ? "🔒 Niv " + m.niv : "$ " + fmt(m.cout);
      el.appendChild(nom); el.appendChild(prix);
      el.addEventListener("click", () => {
        if (m.niv > etat.niveau) { bulle("Débloqué au niveau " + m.niv); return; }
        etat.choix = cle; etat.gomme = false;
        $("#btn-gomme").classList.remove("actif");
        fermerInfo(); construireDock();
      });
      box.appendChild(el);
    }
    majHud();
  }

  function ouvrirInfo(b) {
    etat.selection = b;
    const m = CAT[b.cle];
    $("#i-titre").textContent = m.nom + " · niveau " + b.niv;
    const parts = [];
    if (m.rev) parts.push("Rapporte " + revenuBat(b).toFixed(1) + " $/s");
    if (m.hab) parts.push(Math.round(m.hab * (1 + (b.niv - 1) * 0.5)) + " habitants");
    if (m.bonheur) parts.push("Bonheur +" + m.bonheur);
    if (m.cle === "mine" || m.minerai) parts.push("Produit du minerai vers le port");
    $("#i-desc").textContent = parts.join(" · ") || "Élément de décor de la ville.";
    const canUp = b.cle !== "route" && b.cle !== "rail" && b.niv < 3 && (m.rev || m.hab || m.bonheur);
    const cout = coutAmelio(b);
    $("#i-ameliorer").style.display = canUp ? "block" : "none";
    $("#i-ameliorer").textContent = "Améliorer · $" + fmt(cout);
    $("#i-ameliorer").disabled = etat.argent < cout;
    $("#info").classList.remove("cache");
  }
  function fermerInfo() { etat.selection = null; const i = $("#info"); if (i) i.classList.add("cache"); }

  /* ------------------------------ sauvegarde ------------------------------ */
  let sauveEnCours = 0;
  function sauver() {
    if (/:auto=1/.test(location.search)) return;              // la demo ne touche jamais a ta ville
    if (!etat.batiments || !etat.batiments.length) return;   // jamais ecraser une ville par du vide
    try {
      localStorage.setItem(SAVE, JSON.stringify({
        argent: etat.argent, xp: etat.xp, niveau: etat.niveau, heure: etat.heure,
        bat: etat.batiments.map((b) => [b.cle, b.x, b.y, b.niv, b.total]), rails: [...etat.rails], eau: [...etat.eau], viaducs: [...etat.viaducs], sable: [...etat.sable], t: Date.now(),
      }));
    } catch (e) {}
  }
  function lire() {
    try {
      const direct = localStorage.getItem(SAVE);
      if (direct) return JSON.parse(direct);
      // reprise d'une ancienne sauvegarde
      for (const k of SAVE_ANCIENNES) {
        const v = localStorage.getItem(k);
        if (v) { const d = JSON.parse(v); localStorage.setItem(SAVE, v); return d; }
      }
      return null;
    } catch (e) { return null; }
  }

  function charger(data, sansGain) {
    etat.argent = data.argent; etat.xp = data.xp; etat.niveau = data.niveau;
    etat.heure = data.heure == null ? 8 : data.heure;
    etat.grille.fill(null); etat.batiments = [];
    for (const [cle, x, y, niv, total] of data.bat) {
      const m = CAT[cle];
      if (!m) continue;
      const b = { cle, x, y, w: m.w, h: m.h, niv, total, nee: -99 };
      for (const [cx, cy] of casesDe(b)) if (cx >= 0 && cy >= 0 && cx < N && cy < N) etat.grille[cy * N + cx] = b;
      etat.batiments.push(b);
    }
    etat.rails = new Set(data.rails || []);
    etat.eau = new Set(data.eau || []);
    etat.viaducs = new Set(data.viaducs || []);
    etat.sable = new Set(data.sable || []);
    regenererSol();
    recalculer();
    const sec = clamp((Date.now() - (data.t || Date.now())) / 1000, 0, 7200);
    const gain = sansGain ? 0 : Math.floor(etat.revenuSec * sec * 0.5);
    if (gain > 5) { etat.argent += gain; setTimeout(() => bulle("Pendant ton absence : +" + fmt(gain) + " $"), 700); }
    majTrain();
  }

  function nouvelleVille() {
    etat.argent = 2500; etat.xp = 0; etat.niveau = 1;
    etat.grille.fill(null); etat.batiments = [];
    const c = Math.floor(N / 2) - 4;
    for (let i = 0; i < 9; i++) {
      const b = { cle: "route", x: c + i, y: c + 2, w: 1, h: 1, niv: 1, total: 8, nee: -99 };
      etat.grille[(c + 2) * N + (c + i)] = b; etat.batiments.push(b);
    }
    for (let j = 0; j < 5; j++) {
      const x = c + 4, y = c + 2 + j;
      if (!etat.grille[y * N + x]) {
        const b = { cle: "route", x, y, w: 1, h: 1, niv: 1, total: 8, nee: -99 };
        etat.grille[y * N + x] = b; etat.batiments.push(b);
      }
    }
    for (const [cle, x, y] of [["maison", c + 1, c + 1], ["maison", c + 3, c + 1], ["boutique", c + 5, c + 1], ["maison", c + 6, c + 3]]) {
      const m = CAT[cle];
      const b = { cle, x, y, w: m.w, h: m.h, niv: 1, total: m.cout, nee: -99 };
      for (const [cx, cy] of casesDe(b)) etat.grille[cy * N + cx] = b;
      etat.batiments.push(b);
    }
    recalculer();
  }

  function statsAccueil() {
    const d = lire();
    const btn = $("#btn-jouer");
    if (btn) btn.textContent = d && d.bat && d.bat.length ? "Reprendre ma ville" : "Commencer à bâtir";
    const rl = $("#a-reprise");
    if (rl) rl.textContent = d && d.bat && d.bat.length ? "Ta ville t'attend, on reprend où tu t'es arrêté." : "Sauvegarde automatique : ta ville est gardée.";
    $("#a-niveau").textContent = d ? d.niveau : 1;
    $("#a-bat").textContent = d ? d.bat.filter((b) => b[0] !== "route" && b[0] !== "rail").length : 0;
    let hab = 0;
    if (d) for (const b of d.bat) { const m = CAT[b[0]]; if (m) hab += (m.hab || 0) * (1 + (b[3] - 1) * 0.5); }
    $("#a-hab").textContent = fmt(hab);
  }

  /* ------------------------------ rendu ------------------------------ */
  const canvas = $("#scene");
  const ctx = canvas.getContext("2d");
  let dpr = 1;

  function redim() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    L = canvas.clientWidth || window.innerWidth;
    Hc = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(L * dpr);
    canvas.height = Math.round(Hc * dpr);
    limiterCam();
  }

  function recentrer() {
    const c = iso(N * 0.56, N * 0.56);
    cam.x = c.x; cam.y = c.y;
    const aFit = Math.min(L / (N * TW * 0.78), Hc / (N * TH * 0.95));
    cam.z = clamp(aFit * 1.12, 0.62, ZOOM_MAX);
    limiterCam();
    camV.x = cam.x; camV.y = cam.y; camV.z = cam.z;
  }

  let survol = null;

  function dessinerPetit(ctx, x, y, coul, ph, assis) {
    const sw = Math.sin(ph) * 1.6;
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath(); ctx.ellipse(x + 1, y + 1, 3, 1.3, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = coul; ctx.lineWidth = 1.6; ctx.lineCap = "round";
    // jambes
    ctx.beginPath();
    ctx.moveTo(x, y - 4); ctx.lineTo(x - sw * 0.7, y);
    ctx.moveTo(x, y - 4); ctx.lineTo(x + sw * 0.7, y);
    ctx.stroke();
    // corps
    ctx.fillStyle = coul;
    ctx.fillRect(x - 1.5, y - 9 + (assis ? 2 : 0), 3, 5.5);
    // tete
    ctx.fillStyle = "#f0c9a0";
    ctx.beginPath(); ctx.arc(x, y - 10.5 + (assis ? 2 : 0), 1.9, 0, 6.283); ctx.fill();
  }

  function dessinerVehicule(ctx, x, y, ang, coul, long, large, camion) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(-long / 2, -large / 2 + 1.5, long, large);
    ctx.fillStyle = coul;
    ctx.fillRect(-long / 2, -large / 2, long, large);
    ctx.fillStyle = "rgba(210,235,250,0.9)";
    ctx.fillRect(-long * 0.1, -large / 2 + 0.8, long * 0.28, large - 1.6);
    if (camion) {
      ctx.fillStyle = "#c26a2a";
      ctx.fillRect(-long / 2, -large / 2 - 1.5, long * 0.55, large + 3);
    }
    ctx.restore();
  }

  function dessiner() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, L, Hc);

    // ciel selon l'heure
    const hN = 1 - clamp(etat.nuit, 0, 1);
    const c1 = `rgb(${Math.round(10 + 15 * hN)},${Math.round(58 + 70 * hN)},${Math.round(90 + 80 * hN)})`;
    const c2 = `rgb(${Math.round(8 + 10 * hN)},${Math.round(40 + 50 * hN)},${Math.round(66 + 60 * hN)})`;
    const fond = ctx.createLinearGradient(0, 0, 0, Hc);
    fond.addColorStop(0, c1); fond.addColorStop(1, c2);
    ctx.fillStyle = fond; ctx.fillRect(0, 0, L, Hc);

    ctx.save();
    ctx.translate(L / 2, Hc / 2);
    ctx.scale(camV.z, camV.z);
    ctx.translate(-camV.x, -camV.y);

    if (sol) ctx.drawImage(sol, -solOrigine.x, -solOrigine.y);

    // bateaux
    for (const b of etat.bateaux) {
      ctx.save(); ctx.translate(b.x, b.y);
      ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(2, 5, 16, 5, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = "#f4f4f0"; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.lineTo(9, 7); ctx.lineTo(-10, 7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = b.c; ctx.fillRect(-14, 0, 28, 2);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(1, -2); ctx.lineTo(1, -24); ctx.lineTo(13, -4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // rails (couche separee : ils passent sous les routes)
    for (const k of etat.rails) {
      const [rx, ry] = k.split(",").map(Number);
      const pr = iso(rx, ry);
      ctx.save(); ctx.translate(pr.x, pr.y);
      dessinerRail(ctx, rx, ry);
      ctx.restore();
    }

    // routes au sol
    for (const b of etat.batiments) {
      if (b.cle !== "route" && b.cle !== "rondPoint" && b.cle !== "pont" && b.cle !== "trottoir") continue;
      const p = iso(b.x, b.y);
      ctx.save(); ctx.translate(p.x, p.y);
      if (b.cle === "rondPoint") { losange(ctx, 0, 0, TW + 1, TH + 1, "#4c525c"); losange(ctx, 0, 0, TW * 0.62, TH * 0.62, "#5bb04a"); losange(ctx, 0, 0, TW * 0.32, TH * 0.32, "#6bc258"); arbre(ctx, 0, 0, 8, false); }
      else if (b.cle === "trottoir") dessinerTrottoir(ctx, b.x, b.y);
      else dessinerRoute(ctx, b.x, b.y);
      ctx.restore();
    }

    // lampadaires et feux
    const nuit = etat.nuit > 0.45;
    for (const b of etat.batiments) {
      if (b.cle !== "route") continue;
      let voisins = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (voisinRoute(b.x + dx, b.y + dy)) voisins++;
      const p = iso(b.x, b.y);
      if (voisins >= 3) {
        ctx.save(); ctx.translate(p.x + TW * 0.26, p.y + TH * 0.1);
        feu(ctx, 0, 0, (etat.temps * 0.7 + (b.x + b.y) * 0.11) % 2);
        ctx.restore();
      } else if ((b.x * 7 + b.y * 3) % 5 === 0) {
        ctx.save(); ctx.translate(p.x - TW * 0.36, p.y - TH * 0.1);
        lampadaire(ctx, 0, 0, nuit);
        ctx.restore();
      }
    }

    // tri en profondeur
    const liste = [];
    for (const b of etat.batiments) {
      if (b.cle === "route" || b.cle === "rondPoint") continue;
      liste.push({ prof: b.x + (b.w - 1) / 2 + b.y + (b.h - 1) / 2, type: "b", b });
    }
    for (const d of deco) {
      if (G(Math.floor(d.x), Math.floor(d.y))) continue;
      liste.push({ prof: d.x + d.y + 0.2, type: "d", d });
    }
    for (const v of etat.voitures) {
      const fx = v.gx + (v.tx - v.gx) * v.t, fy = v.gy + (v.ty - v.gy) * v.t;
      liste.push({ prof: fx + fy + 0.6, type: "v", v, fx, fy });
    }
    for (const p of etat.pietons) {
      const fx = p.mode === "joue" ? p.gx : p.gx + (p.tx - p.gx) * p.t;
      const fy = p.mode === "joue" ? p.gy : p.gy + (p.ty - p.gy) * p.t;
      liste.push({ prof: fx + fy + 0.75, type: "p", p, fx, fy });
    }
    for (const c of etat.camions) {
      const fx = c.px + (c.tx - c.px) * c.t, fy = c.py + (c.ty - c.py) * c.t;
      liste.push({ prof: fx + fy + 0.7, type: "c", c, fx, fy });
    }
    if (etat.train) {
      const tr = etat.train;
      const fx = tr.gx + (tr.tx - tr.gx) * tr.t, fy = tr.gy + (tr.ty - tr.gy) * tr.t;
      liste.push({ prof: fx + fy + 0.15, type: "t", tr, fx, fy });
    }
    liste.sort((a, b) => a.prof - b.prof);

    for (const o of liste) {
      if (o.type === "b") {
        const b = o.b;
        const p = iso(b.x + (b.w - 1) / 2, b.y + (b.h - 1) / 2);
        const age = etat.temps - b.nee;
        let sc = 1, dy = 0;
        if (age < 0.45) { const u = age / 0.45; sc = 0.6 + 0.4 * (1 - Math.pow(1 - u, 3)) + Math.sin(u * 3.14) * 0.1; dy = (1 - u) * -6; }
        ctx.save(); ctx.translate(p.x, p.y + dy); ctx.scale(sc, sc);
        dessinerBatiment(ctx, b.cle, b.niv, etat.temps, b.w, b.h);
        if (b.niv > 1) {
          ctx.fillStyle = "#f5cf1b"; ctx.font = "bold 10px system-ui"; ctx.textAlign = "center";
          ctx.fillText("★".repeat(b.niv - 1), 0, -Math.max(18, b.h * 12) - 8);
        }
        if (etat.selection === b) losange(ctx, 0, 0, TW * b.w * 0.98, TH * b.h * 0.98, "rgba(245,207,27,0.16)", "#f5cf1b");
        ctx.restore();
      } else if (o.type === "d") {
        const p = iso(o.d.x + 0.5 + o.d.ox, o.d.y + 0.5 + o.d.oy);
        arbre(ctx, p.x, p.y, o.d.s, o.d.palmier);
      } else if (o.type === "v") {
        const p = iso(o.fx, o.fy);
        const dx = o.v.tx - o.v.gx, dy2 = o.v.ty - o.v.gy;
        const ang = Math.atan2((dx + dy2) * TH / 2, (dx - dy2) * TW / 2);
        dessinerVehicule(ctx, p.x, p.y, ang, o.v.coul, 14, 6, false);
      } else if (o.type === "c") {
        const p = iso(o.fx, o.fy);
        const dx = o.c.tx - o.c.px, dy2 = o.c.ty - o.c.py;
        const ang = Math.atan2((dx + dy2) * TH / 2, (dx - dy2) * TW / 2);
        dessinerVehicule(ctx, p.x, p.y, ang, "#e8b23a", 20, 8, true);
      } else if (o.type === "p") {
        const p = iso(o.fx, o.fy);
        dessinerPetit(ctx, p.x, p.y, o.p.coul, o.p.ph, o.p.mode === "joue" || o.p.mode === "jardinier");
        if (o.p.mode === "jardinier") {
          // chapeau de paille et arrosoir
          ctx.fillStyle = "#e8c66a";
          ctx.beginPath(); ctx.ellipse(p.x, p.y - 15, 4, 1.7, 0, 0, 6.283); ctx.fill();
          ctx.fillStyle = "#8aa0a8";
          ctx.fillRect(p.x + 3, p.y - 6, 3.5, 2.6);
        }
        if (o.p.mode === "joue") {
          ctx.fillStyle = "rgba(255,255,255,0.85)";
          ctx.beginPath(); ctx.arc(p.x + 2, p.y - 22 - Math.abs(Math.sin(o.p.ph)) * 4, 1.6, 0, 6.283); ctx.fill();
        }
      } else if (o.type === "t") {
        const tr = o.tr;
        // wagons derrière via la trace
        const pas = 16;
        for (let w = tr.wagons; w >= 0; w--) {
          const idx = tr.trace.length - 1 - w * pas;
          let px = o.fx, py = o.fy;
          if (idx >= 0) { px = tr.trace[idx].x; py = tr.trace[idx].y; }
          const p = iso(px, py);
          const tx2 = tr.trace[Math.min(tr.trace.length - 1, Math.max(0, idx + 2))] || { x: px, y: py };
          const dx = tx2.x - px, dy2 = tx2.y - py;
          const ang = Math.atan2((dx + dy2) * TH / 2, (dx - dy2) * TW / 2);
          ctx.save(); ctx.translate(p.x, p.y - 4); ctx.rotate(ang);
          const loco = w === 0;
          ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(-9, 0, 18, 5);
          ctx.fillStyle = loco ? "#1f4f8a" : "#e8e2d2";
          ctx.fillRect(-9, -4, 18, 6);
          ctx.fillStyle = loco ? "#ce1126" : "#c9c3b4";
          ctx.fillRect(-9, -4, 18, 1.6);
          if (loco) {
            ctx.fillStyle = "#f5cf1b"; ctx.fillRect(6, -3, 3, 3);
            if (nuit) { ctx.fillStyle = "rgba(255,240,170,0.9)"; ctx.beginPath(); ctx.arc(9, -2, 3, 0, 6.283); ctx.fill(); }
          }
          ctx.fillStyle = "#3a3d42";
          ctx.beginPath(); ctx.arc(-5, 2, 1.6, 0, 6.283); ctx.fill();
          ctx.beginPath(); ctx.arc(5, 2, 1.6, 0, 6.283); ctx.fill();
          ctx.restore();
        }
      }
    }

    // avions dans le ciel
    for (const a of etat.avions) {
      ctx.save(); ctx.translate(a.x, a.y); ctx.scale(a.s, a.s);
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.beginPath(); ctx.ellipse(6, 10, 16, 4, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = "#f4f6f8";
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 4, 0, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(6, 0); ctx.lineTo(0, -11); ctx.lineTo(-4, -11); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-6, 0); ctx.lineTo(-9, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#009460"; ctx.fillRect(10, -2, 4, 4);
      ctx.restore();
    }

    // aperçu de pose
    if (survol && !etat.gomme && etat.ecran === "jeu") {
      const m = CAT[etat.choix];
      const refus = peutPoser(etat.choix, survol.x, survol.y);
      for (let i = 0; i < m.w; i++) {
        for (let j = 0; j < m.h; j++) {
          const p = iso(survol.x + i, survol.y + j);
          ctx.save(); ctx.translate(p.x, p.y);
          losange(ctx, 0, 0, TW, TH, refus ? "rgba(229,72,77,0.42)" : "rgba(91,227,125,0.38)", refus ? "#e5484d" : "#5be37d");
          ctx.restore();
        }
      }
      const pc = iso(survol.x + (m.w - 1) / 2, survol.y + (m.h - 1) / 2);
      ctx.save(); ctx.translate(pc.x, pc.y); ctx.globalAlpha = 0.72;
      if (etat.choix !== "route" && etat.choix !== "rail") dessinerBatiment(ctx, etat.choix, 1, etat.temps, m.w, m.h);
      ctx.restore();
    }

    // revenus flottants
    for (const f of etat.flottants) {
      const a = 1 - f.t / 1.3;
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.fillStyle = f.col; ctx.font = "bold 13px system-ui"; ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 3;
      ctx.strokeText(f.txt, f.x, f.y - f.t * 34);
      ctx.fillText(f.txt, f.x, f.y - f.t * 34);
      ctx.globalAlpha = 1;
    }

    // ombres des nuages
    for (const n of etat.nuages) {
      ctx.fillStyle = "rgba(0,20,40,0.06)";
      ctx.beginPath(); ctx.ellipse(n.x, n.y, 150 * n.s, 55 * n.s, 0, 0, 6.283); ctx.fill();
    }


    dessinerSable();
    dessinerBateauxCanal();
    dessinerViaducs();

    dessinerNageurs();
    dessinerHelico();
    dessinerExplosions();

    // unites de secours (police, pompiers, ambulance)
    for (const u of etat.unites) {
      const p = iso(u.gx, u.gy);
      const coul = u.type === "police" ? "#2f6fd0" : u.type === "pompier" ? "#d63a2f" : "#f4f6f4";
      ctx.save();
      ctx.translate(p.x, p.y);
      // ombre
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath(); ctx.ellipse(0, 2, 11, 4, 0, 0, 6.283); ctx.fill();
      ctx.rotate(u.ang * 0.35);
      // carrosserie
      ctx.fillStyle = coul; ctx.fillRect(-10, -6, 20, 8);
      ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(-10, -6, 20, 2);
      ctx.fillStyle = "#22303c"; ctx.fillRect(-6, -5, 5, 4); ctx.fillRect(2, -5, 5, 4);
      if (u.type === "pompier") { ctx.fillStyle = "#f5cf1b"; ctx.fillRect(-10, -1, 20, 1.6); }
      ctx.restore();

      // sirene tricolore (rouge / jaune / vert) quand l'unite roule en urgence
      if (u.sirene > 0) {
        const ph = Math.floor(etat.temps * 6) % 3;
        const cols = ["#e5484d", "#f5cf1b", "#009460"];
        ctx.save(); ctx.translate(p.x, p.y - 9);
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = cols[ph];
        ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, 6.283); ctx.fill();
        ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.arc(0, 0, 7 + (etat.temps * 8) % 6, 0, 6.283); ctx.fill();
        ctx.restore();
      }
    }

    // alertes en cours
    for (const a of etat.alertes) {
      if (a.fini) continue;
      const p = iso(a.x + (a.w || 1) * 0.0, a.y);
      const puls = 0.5 + 0.5 * Math.sin(etat.temps * 6);
      ctx.save();
      ctx.translate(p.x, p.y - 30);
      ctx.globalAlpha = 0.55 + puls * 0.45;
      ctx.fillStyle = "rgba(229,72,77,0.28)";
      ctx.beginPath(); ctx.arc(0, 0, 13 + puls * 5, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.font = "bold 15px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(ALERTES[a.type].ico, 0, 0);
      // chrono
      ctx.fillStyle = "rgba(10,14,20,0.8)";
      ctx.fillRect(-11, 10, 22, 10);
      ctx.fillStyle = "#fff"; ctx.font = "bold 8px system-ui, sans-serif";
      ctx.fillText(Math.max(0, Math.ceil(a.duree - a.t)) + "s", 0, 15);
      ctx.restore();
    }

    ctx.restore();

    // voile de nuit : uniquement sur la ville, jamais sur l'ecran ni sur les menus
    if (etat.nuit > 0.02) {
      ctx.save();
      ctx.translate(L / 2, Hc / 2);
      ctx.scale(camV.z, camV.z);
      ctx.translate(-camV.x, -camV.y);
      const nord = iso(0, 0), est = iso(N, 0), sud = iso(N, N), ouest = iso(0, N);
      ctx.beginPath();
      ctx.moveTo(nord.x, nord.y); ctx.lineTo(est.x, est.y);
      ctx.lineTo(sud.x, sud.y); ctx.lineTo(ouest.x, ouest.y);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = "rgba(8,18,48," + (etat.nuit * 0.34).toFixed(2) + ")";
      ctx.fillRect(ouest.x, nord.y, est.x - ouest.x, sud.y - nord.y);
      ctx.restore();
    }
  }

  /* ------------------------------ boucle ------------------------------ */
  let dernier = 0, accSauve = 0, accHud = 0, accFlot = 0;
  function boucle(t) {
    const dt = Math.min(0.05, (t - dernier) / 1000 || 0.016);
    dernier = t;
    const k = Math.min(1, dt * 12);
    camV.x += (cam.x - camV.x) * k;
    camV.y += (cam.y - camV.y) * k;
    camV.z += (cam.z - camV.z) * k;

    if (etat.ecran === "jeu") {
      etat.temps += dt;
      if (etat.jourFixe) etat.heure = 12;
      else etat.heure = (etat.heure + dt * (24 / 150)) % 24;
      // nuit entre 19h et 6h
      const hh = etat.heure;
      let n = 0;
      if (hh >= 19) n = clamp((hh - 19) / 2, 0, 1);
      else if (hh < 6) n = 1;
      else if (hh < 7) n = clamp(1 - (hh - 6), 0, 1);
      etat.nuit = etat.jourFixe ? 0 : n;

      etat.argent += etat.revenuSec * dt;
      majVoitures(dt); verifierCollisions(dt); majPietons(dt); majCamions(dt); majTrainBouge(dt); majAvions(dt); majMeteo(dt);
      majAlertes(dt); majUnites(dt); majTraficHautBouge(dt); majBateauxCanal(dt); majHelico(dt); majFusee(dt); majExplosions(dt);
      for (const f of etat.flottants) f.t += dt;
      etat.flottants = etat.flottants.filter((f) => f.t < 1.3);

      accFlot += dt;
      if (accFlot > 2.4 && etat.batiments.length) {
        accFlot = 0;
        const gen = etat.batiments.filter((b) => revenuBat(b) > 0);
        if (gen.length) {
          const b = gen[(Math.random() * gen.length) | 0];
          const p = iso(b.x + (b.w - 1) / 2, b.y + (b.h - 1) / 2);
          flottant("+" + fmt(revenuBat(b) * 2.4), p.x, p.y - 20, "#ffe680");
        }
      }
      accHud += dt;
      if (accHud > 0.12) { accHud = 0; majHud(); }
      accSauve += dt;
      if (accSauve > 2.5) { accSauve = 0; if (etat.modifie) { sauver(); etat.modifie = false; } }
      dessiner();
    }
    requestAnimationFrame(boucle);
  }

  /* ------------------------------ entrées ------------------------------ */
  const pointeurs = new Map();
  let geste = null;

  const posCanvas = (ev) => { const r = canvas.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };

  canvas.addEventListener("pointerdown", (ev) => {
    if (etat.ecran !== "jeu") return;
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
    const p = posCanvas(ev);
    pointeurs.set(ev.pointerId, p);
    if (pointeurs.size === 1) {
      geste = { x0: p.x, y0: p.y, cx: cam.x, cy: cam.y, bouge: false, pince: false };
      survol = versCase(p.x, p.y);
    } else if (pointeurs.size === 2) {
      const [a, b] = [...pointeurs.values()];
      geste = { pince: true, d0: Math.hypot(a.x - b.x, a.y - b.y), z0: cam.z, bouge: true };
    }
  });

  canvas.addEventListener("pointermove", (ev) => {
    const p = posCanvas(ev);
    if (!pointeurs.has(ev.pointerId)) { survol = versCase(p.x, p.y); return; }
    pointeurs.set(ev.pointerId, p);
    if (!geste) return;
    if (geste.pince && pointeurs.size >= 2) {
      const [a, b] = [...pointeurs.values()];
      cam.z = geste.z0 * (Math.hypot(a.x - b.x, a.y - b.y) / geste.d0);
      limiterCam(); return;
    }
    const dx = p.x - geste.x0, dy = p.y - geste.y0;
    if (!geste.bouge && Math.hypot(dx, dy) > 9) geste.bouge = true;
    if (geste.bouge) {
      cam.x = geste.cx - dx / camV.z;
      cam.y = geste.cy - dy / camV.z;
      limiterCam(); camV.x = cam.x; camV.y = cam.y; survol = null;
    } else survol = versCase(p.x, p.y);
  });

  function fin(ev) {
    const g = geste, p = posCanvas(ev);
    pointeurs.delete(ev.pointerId);
    if (pointeurs.size === 0) {
      geste = null;
      if (g && !g.bouge && !g.pince) agir(p);
      survol = null;
    }
  }
  canvas.addEventListener("pointerup", fin);
  canvas.addEventListener("pointercancel", (ev) => { pointeurs.delete(ev.pointerId); if (!pointeurs.size) geste = null; });
  canvas.addEventListener("wheel", (ev) => {
    if (etat.ecran !== "jeu") return;
    ev.preventDefault();
    cam.z *= ev.deltaY < 0 ? 1.12 : 0.89;
    limiterCam();
  }, { passive: false });

  function agir(p) {
    const c = versCase(p.x, p.y);
    if (c.x < 0 || c.y < 0 || c.x >= N || c.y >= N) { bulle("Hors du terrain"); return; }
    const b = G(c.x, c.y);
    if (etat.gomme) {
      const k = c.x + "," + c.y;
      if (etat.sable.has(k)) { retirerSable(c.x, c.y); return; }
      if (etat.viaducs.has(k)) { retirerViaduc(c.x, c.y); return; }
      if (etat.eau.has(k)) { retirerEau(c.x, c.y); return; }
      if (etat.rails.has(k)) { retirerRail(c.x, c.y); return; }
      if (b) demolir(b); else bulle("Rien à démolir ici");
      return;
    }
    if (b && b.cle !== "route") { ouvrirInfo(b); return; }
    fermerInfo();
    if (b && (b.cle === "route" || b.cle === "trottoir" || b.cle === "rondPoint") &&
        etat.choix !== "route" && etat.choix !== "rail" && etat.choix !== "trottoir" && etat.choix !== "pont") {
      bulle("Ici c'est la voie. Touche une case libre juste à côté.");
      return;
    }
    poser(etat.choix, c.x, c.y);
  }

  /* ------------------------------ boutons ------------------------------ */
  $("#btn-zoom-plus").addEventListener("click", () => { cam.z *= 1.3; limiterCam(); });
  $("#btn-zoom-moins").addEventListener("click", () => { cam.z /= 1.3; limiterCam(); });
  $("#btn-vue").addEventListener("click", recentrer);
  $("#btn-deployer").addEventListener("click", () => { if (etat.ecran === "jeu") deployer(); });
  $("#btn-jour").addEventListener("click", () => {
    etat.jourFixe = !etat.jourFixe;
    $("#btn-jour").textContent = etat.jourFixe ? "☀️" : "🌙";
    bulle(etat.jourFixe ? "Journée permanente activée" : "Cycle jour / nuit activé");
    son(520, 0.09, "triangle", 0.06);
  });
  $("#btn-annuler").addEventListener("click", () => { if (etat.ecran === "jeu") annuler(); });
  $("#btn-reset-jeu").addEventListener("click", () => { if (etat.ecran === "jeu") reinitialiser(); });
  $("#btn-gomme").addEventListener("click", () => {
    etat.gomme = !etat.gomme;
    $("#btn-gomme").classList.toggle("actif", etat.gomme);
    fermerInfo();
    bulle(etat.gomme ? "Mode démolition : touche un bâtiment" : "Mode construction");
    construireDock();
  });
  $("#btn-son").addEventListener("click", () => { etat.son = !etat.son; $("#btn-son").textContent = etat.son ? "🔊" : "🔇"; });
  $("#btn-menu").addEventListener("click", () => { sauver(); statsAccueil(); afficher("accueil"); });
  $("#i-fermer").addEventListener("click", fermerInfo);
  $("#i-vendre").addEventListener("click", () => { if (etat.selection) demolir(etat.selection); });
  $("#i-ameliorer").addEventListener("click", () => {
    const b = etat.selection;
    if (!b || b.niv >= 3) return;
    const cout = coutAmelio(b);
    if (etat.argent < cout) { bulle("Il te manque " + fmt(cout - etat.argent) + " $"); return; }
    etat.argent -= cout; b.niv += 1; b.total += cout;
    gagnerXp(Math.round(cout / 15));
    recalculer(); son(740, 0.14, "triangle", 0.09);
    etat.modifie = true; ouvrirInfo(b);
  });

  function afficher(nom) {
    etat.ecran = nom;
    $("#accueil").classList.toggle("actif", nom === "accueil");
    $("#jeu").classList.toggle("actif", nom === "jeu");
    if (nom === "jeu") redim();
  }

  $("#btn-jouer").addEventListener("click", () => {
    const d = lire();
    if (d) charger(d); else nouvelleVille();
    genererSol(); genererDeco();
    construireOnglets(); construireDock();
    afficher("jeu");
    redim(); recentrer(); recalculer(); majHud();
    if (!d) bulle("Trace des routes, pose des maisons, et relie une mine à un port");
    son(520, 0.12, "triangle", 0.07);
  });

  $("#btn-reset").addEventListener("click", () => {
    if (confirm("Effacer toute ta ville et recommencer ?")) {
      try { localStorage.removeItem(SAVE); } catch (e) {}
      statsAccueil();
    }
  });

  window.addEventListener("resize", () => { if (etat.ecran === "jeu") redim(); });
  window.addEventListener("pagehide", () => { if (etat.batiments.length) sauver(); });
  window.addEventListener("beforeunload", () => { if (etat.batiments.length) sauver(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && etat.batiments.length) sauver(); });

  /* ------------------------------ pilote de démo ------------------------------ */
  const AUTO = /auto=1/.test(location.search);
  window.__sim = etat;
  window.__simApi = {
    poser, recentrer, CAT, N,
    cam: camV,
    bfsRoute: bfsRoute,
    voisinRoute: voisinRoute,
    typeSol: typeSol,
    G: G,
    camC: cam,
    limiter: () => limiterCam(),
    caseCentre: () => ({ x: Math.round((cam.x / (TW / 2) + cam.y / (TH / 2)) / 2), y: Math.round((cam.y / (TH / 2) - cam.x / (TW / 2)) / 2) }),
    agir: (sx, sy) => agir({ x: sx, y: sy }),
    annuler: () => annuler(),
    reinitialiser: () => reinitialiser(),
    debug: () => {
      const mines = etat.batiments.filter((b) => b.cle === "mine");
      const ports = etat.batiments.filter((b) => b.cle === "port");
      return {
        routes: routes().length,
        mine: mines.map((m) => ({ x: m.x, y: m.y, adj: casesRouteAdjacentes(m).length })),
        port: ports.map((p2) => ({ x: p2.x, y: p2.y, adj: casesRouteAdjacentes(p2).length })),
        chemin: mines.length && ports.length ? !!bfsRoute(mines[0], ports[0]) : null,
      };
    },
    ecran: (gx, gy) => { const p = iso(gx, gy); return { x: (p.x - camV.x) * camV.z + L / 2, y: (p.y - camV.y) * camV.z + Hc / 2 }; },
  };

  function placeAuMieux(cle, cx, cy, rayon) {
    rayon = rayon || 8;
    let best = null, bestD = 1e9;
    const m = CAT[cle];
    for (let r = 0; r <= rayon; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = cx + dx, y = cy + dy;
          if (x < 0 || y < 0 || x + m.w > N || y + m.h > N) continue;
          if (peutPoser(cle, x, y) !== null) continue;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD) { bestD = d2; best = { x, y }; }
        }
      }
      if (best) break;
    }
    if (best) poser(cle, best.x, best.y, true);
    return best;
  }

  function tracerRoute(x0, y0, x1, y1) {
    let x = x0, y = y0;
    let garde = 0;
    while ((x !== x1 || y !== y1) && garde++ < 120) {
      if (!G(x, y)) poser("route", x, y, true);
      if (x !== x1) x += (x1 > x ? 1 : -1);
      else if (y !== y1) y += (y1 > y ? 1 : -1);
    }
  }

  function pilote() {
    const c = Math.floor(N / 2) - 3;
    etat.argent = 9e6; etat.niveau = 9;

    // réseau routier principal
    for (let i = -9; i <= 12; i++) { poser("route", c + i, c, true); poser("route", c + i, c + 5, true); poser("route", c + i, c - 5, true); }
    for (let j = -9; j <= 11; j++) { poser("route", c, c + j, true); poser("route", c + 7, c + j, true); poser("route", c - 7, c + j, true); }

    // trottoirs pietons le long des axes (les gens n'y marchent que la)
    for (let i = -8; i <= 11; i++) { poser("trottoir", c + i, c + 1, true); poser("trottoir", c + i, c - 1, true); }
    for (let j = -8; j <= 10; j++) { poser("trottoir", c + 1, c + j, true); poser("trottoir", c - 1, c + j, true); }
    // voie ferrée : une ligne droite traversant la ville (passages à niveau autorisés)
    for (let i = -9; i <= 11; i++) poser("rail", c + i, c + 9, true);
    for (let j = 2; j <= 9; j++) poser("rail", c + 11, c + j, true);
    poser("rondPoint", c - 3, c, true);

    // habitat et commerces le long des axes
    const bats = [
      ["gratte", 1, 1], ["gratte", 2, 1], ["tour", 3, 1], ["tour", 4, 1], ["hotel", 5, 1], ["banque", 6, 1],
      ["immeuble", 1, 2], ["immeuble", 2, 2], ["immeuble", 3, 2], ["hotel", 4, 2], ["boutique", 5, 2], ["cinema", 6, 2],
      ["gratte", 8, 1], ["tour", 9, 1], ["immeuble", 10, 1], ["immeuble", 11, 1], ["pharmacie", 5, 3],
      ["villa", 1, 4], ["villa", 2, 4], ["maison", 3, 4], ["maison", 4, 4], ["parc", 5, 4], ["place", 6, 4],
      ["ecole", 10, 6], ["hopital", 11, 6],
      ["maison", -1, 1], ["maison", -2, 1], ["villa", -3, 1], ["maison", -4, 1], ["maison", -5, 1],
      ["maison", -1, -1], ["maison", -2, -1], ["villa", -3, -1], ["immeuble", -4, -1], ["marche", -5, -1],
      ["immeuble", -1, 4], ["immeuble", -2, 4], ["marche", -3, 4], ["parc", -4, 4],
      ["monument", 2, 6], ["statue", 4, 6], ["roue", 6, 6], ["maison", 1, -1], ["tour", 1, -3],
      ["immeuble", 3, -1], ["boutique", 5, -1], ["ecole", -2, -4], ["parc", 3, -4], ["villa", 5, -4],
    ];
    for (const [cle, dx, dy] of bats) poser(cle, c + dx, c + dy, true);

    // grands bâtiments : on leur cherche une vraie place
    placeAuMieux("gare", c + 4, c + 8, 7);
    placeAuMieux("marcheC", c + 3, c + 2, 6);
    placeAuMieux("commissariat", c + 9, c + 6, 7);
    placeAuMieux("pompiers", c - 9, c + 6, 7);
    placeAuMieux("prefecture", c - 5, c + 2, 8);
    placeAuMieux("mairie", c + 9, c + 2, 8);
    placeAuMieux("universite", c + 2, c - 2, 8);
    placeAuMieux("stade", c - 6, c - 3, 9);
    const aero = placeAuMieux("aeroport", c + 6, c + 11, 12);

    // route côtière vers la mer, puis port posé contre elle
    let cx2 = c + 7, cy2 = c + 5;
    for (let i = 0; i < 10; i++) {
      const nx = cx2 + (i < 4 ? 0 : 1), ny = cy2 + (i < 4 ? 1 : 1);
      if (nx >= N || ny >= N) break;
      if (!G(nx, ny)) { if (!poser("route", nx, ny, true)) break; }
      cx2 = nx; cy2 = ny;
    }
    let casePort = null;
    const routesListe = etat.batiments.filter((x) => x.cle === "route");
    for (const b of routesListe) {
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, -1], [-1, 1], [2, 0], [0, 2]]) {
        const x = b.x + dx, y = b.y + dy;
        if (x < 0 || y < 0 || x + 1 >= N || y + 1 >= N) continue;
        if (peutPoser("port", x, y) === null) { casePort = { x, y }; break; }
      }
      if (casePort) break;
    }
    if (casePort) poser("port", casePort.x, casePort.y, true);

    // mine reliée au port par la route
    // la plage est sablee et animee (parasols)
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (typeSol(x, y) === 1 && !G(x, y)) etat.sable.add(x + "," + y);
    }
    regenererSol();

    // vie de la ville : jardins, helico, tourisme d'affaires, site de lancement
    placeAuMieux("heliport", c + 9, c - 6, 8);
    placeAuMieux("fusee", c - 10, c - 8, 10);
    placeAuMieux("jardin", c + 2, c + 3, 5);
    placeAuMieux("roseraie", c - 2, c + 3, 5);
    placeAuMieux("tourBureaux", c + 4, c - 3, 7);
    placeAuMieux("tourHab", c + 5, c - 4, 7);
    placeAuMieux("obelisque", c + 1, c - 3, 6);
    placeAuMieux("arc", c - 4, c - 4, 7);
    placeAuMieux("tourHorloge", c + 3, c - 4, 6);
    const mine = placeAuMieux("mine", c + 9, c - 8, 10);
    if (mine && casePort) tracerRoute(c + 7, c - 5, mine.x, mine.y + 1);

    // un pont sur l'eau
    for (let r = 0; r < 30 && !etat.batiments.some((b) => b.cle === "pont"); r++) {
      for (let dx = -r; dx <= r && !etat.batiments.some((b) => b.cle === "pont"); dx++) {
        const x = c + dx, y = c + 12;
        if (x >= 0 && y < N && peutPoser("pont", x, y) === null) poser("pont", x, y, true);
      }
    }

    // front de mer
    let mis = 0;
    for (let x = 5; x < N && mis < 16; x++) {
      for (let y = N - 1; y >= 0; y--) {
        if (typeSol(x, y) === 1 && !G(x, y)) { poser(mis % 3 === 0 ? "plage_b" : "parasol", x, y, true); mis++; break; }
      }
    }

    etat.argent = 74000;
    recalculer(); construireDock();
  }

  /* ------------------------------ démarrage ------------------------------ */
  statsAccueil();
  requestAnimationFrame(boucle);
  if (AUTO) {
    setTimeout(() => { $("#btn-jouer").click(); setTimeout(pilote, 400); }, 300);
  }
})();
