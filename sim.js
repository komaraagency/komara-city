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
  const fmt = (n) => {
    n = Math.floor(n);
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + " M";
    if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + " k";
    return String(n);
  };

  /* ------------------------------ monde ------------------------------ */
  const N = 36;                 // grille N x N
  const TW = 64, TH = 32;       // losange d'une case
  const SAVE = "komara-city-v1";

  // zones : 0 terre, 1 plage, 2 mer
  function typeSol(x, y) {
    const d = x + y;            // la mer est au sud-est
    if (d >= N + 9) return 2;
    if (d >= N + 5) return 1;
    // petite baie a l'ouest
    if (x < 6 && y > N - 11) return (x + (N - y) < 8) ? 2 : 1;
    return 0;
  }

  /* ------------------------------ catalogue ------------------------------ */
  // h = hauteur en etages, w = largeur en cases
  const CAT = {
    route:    { nom: "Route",         cout: 8,    rev: 0,    hab: 0,   w: 1, h: 0,  onglet: "route",  niveauReq: 1, type: "route" },
    maison:   { nom: "Maison",        cout: 90,   rev: 0.9,  hab: 4,   w: 1, h: 1,  onglet: "habitat", niveauReq: 1, teinte: ["#e9d8b4", "#d96a3a"] },
    villa:    { nom: "Villa",         cout: 260,  rev: 2.6,  hab: 8,   w: 1, h: 1,  onglet: "habitat", niveauReq: 2, teinte: ["#f4efe2", "#3b8fb8"] },
    immeuble: { nom: "Immeuble",      cout: 620,  rev: 6.5,  hab: 30,  w: 1, h: 4,  onglet: "habitat", niveauReq: 3, teinte: ["#c9b99c", "#b4533a"] },
    tour:     { nom: "Tour",          cout: 1900, rev: 20,   hab: 90,  w: 1, h: 9,  onglet: "habitat", niveauReq: 5, teinte: ["#7fb6d6", "#2e5f86"] },
    gratte:   { nom: "Gratte-ciel",   cout: 5200, rev: 58,   hab: 220, w: 1, h: 14, onglet: "habitat", niveauReq: 7, teinte: ["#9bd0e8", "#1d4668"] },
    boutique: { nom: "Boutique",      cout: 150,  rev: 3.2,  hab: 0,   w: 1, h: 1,  onglet: "commerce", niveauReq: 1, teinte: ["#ffe08a", "#c8302f"] },
    marche:   { nom: "Marché",        cout: 420,  rev: 8.8,  hab: 0,   w: 1, h: 1,  onglet: "commerce", niveauReq: 2, teinte: ["#f1a94a", "#2f9a58"] },
    hotel:    { nom: "Hôtel",         cout: 1500, rev: 24,   hab: 0,   w: 1, h: 6,  onglet: "commerce", niveauReq: 4, teinte: ["#f5ede0", "#c8302f"] },
    port:     { nom: "Quai",          cout: 700,  rev: 14,   hab: 0,   w: 1, h: 1,  onglet: "plage",   niveauReq: 3, mer: true, teinte: ["#8a6a45", "#4b3a28"] },
    plage_b:  { nom: "Resto plage",   cout: 320,  rev: 6.5,  hab: 0,   w: 1, h: 1,  onglet: "plage",   niveauReq: 2, plage: true, teinte: ["#f3d28a", "#2a9bd1"] },
    parasol:  { nom: "Parasols",      cout: 60,   rev: 1.1,  hab: 0,   w: 1, h: 0,  onglet: "plage",   niveauReq: 1, plage: true, teinte: ["#e8372f", "#f5cf1b"] },
    roue:     { nom: "Grande roue",   cout: 2400, rev: 30,   hab: 0,   w: 1, h: 8,  onglet: "loisirs", niveauReq: 5, teinte: ["#f06292", "#7cb342"] },
    parc:     { nom: "Parc",          cout: 110,  rev: 0.4,  hab: 0,   w: 1, h: 0,  onglet: "loisirs", niveauReq: 1, bonheur: 4, teinte: ["#4f9b3f", "#2c6a28"] },
    ecole:    { nom: "École",         cout: 520,  rev: 0,    hab: 0,   w: 1, h: 2,  onglet: "services", niveauReq: 2, bonheur: 7, teinte: ["#e5c15a", "#b3342e"] },
    hopital:  { nom: "Hôpital",       cout: 1100, rev: 0,    hab: 0,   w: 1, h: 3,  onglet: "services", niveauReq: 3, bonheur: 11, teinte: ["#f2f2ee", "#d11231"] },
    gare:     { nom: "Gare",          cout: 2800, rev: 34,   hab: 0,   w: 1, h: 2,  onglet: "services", niveauReq: 4, teinte: ["#d9cdb3", "#3b6fb3"] },
  };
  const ONGLETS = [
    ["route", "🛣️ Routes"], ["habitat", "🏠 Habitat"], ["commerce", "🛍️ Commerce"],
    ["plage", "🏖️ Plage"], ["loisirs", "🎡 Loisirs"], ["services", "🏥 Services"],
  ];
  // XP necessaire pour atteindre le niveau n+1
  const XP_NIVEAU = (n) => 120 + n * n * 90;

  /* ------------------------------ etat ------------------------------ */
  const etat = {
    ecran: "accueil",
    argent: 1500,
    xp: 0,
    niveau: 1,
    grille: [],           // N*N : null ou {cle, niv, x, y}
    batiments: [],
    choix: "route",
    onglet: "route",
    gomme: false,
    selection: null,
    son: true,
    temps: 0,
    voitures: [],
    nuages: [],
    bateaux: [],
    flottants: [],        // textes "+$" qui montent
    revenuSec: 0,
    bonheur: 100,
    habitants: 0,
    modifie: false,
  };
  for (let i = 0; i < N * N; i++) etat.grille.push(null);
  const G = (x, y) => (x < 0 || y < 0 || x >= N || y >= N) ? null : etat.grille[y * N + x];

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
  const cam = { x: 0, y: 0, z: 1 };       // cible (monde iso)
  const camV = { x: 0, y: 0, z: 1 };      // affichee
  let L = 0, Hc = 0;

  // case -> point monde iso
  const iso = (gx, gy) => ({ x: (gx - gy) * TW / 2, y: (gx + gy) * TH / 2 });
  // point ecran -> case
  function versCase(sx, sy) {
    const wx = (sx - L / 2) / camV.z + camV.x;
    const wy = (sy - Hc / 2) / camV.z + camV.y;
    const gx = (wx / (TW / 2) + wy / (TH / 2)) / 2;
    const gy = (wy / (TH / 2) - wx / (TW / 2)) / 2;
    return { x: Math.floor(gx + 0.0), y: Math.floor(gy + 0.0), fx: gx, fy: gy };
  }
  const ZOOM_MIN = 0.45, ZOOM_MAX = 2.6;

  function limiterCam() {
    const centre = iso(N / 2, N / 2);
    const demi = N * TW / 2;
    cam.x = clamp(cam.x, centre.x - demi * 0.82, centre.x + demi * 0.82);
    cam.y = clamp(cam.y, centre.y - N * TH * 0.5, centre.y + N * TH * 0.5);
    cam.z = clamp(cam.z, ZOOM_MIN, ZOOM_MAX);
  }

  /* ------------------------------ dessin des formes ------------------------------ */
  function eclaircir(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
    return "rgb(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + ")";
  }

  function losange(ctx, cx, cy, w, h, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy);
    ctx.lineTo(cx, cy + h / 2);
    ctx.lineTo(cx - w / 2, cy);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  // prisme isometrique : base centree en (cx, cy) = centre du losange au sol
  function prisme(ctx, cx, cy, w, h, haut, murG, murD, toit, bord) {
    const hw = w / 2, hh = h / 2;
    // mur gauche
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx, cy + hh - haut); ctx.lineTo(cx - hw, cy - haut);
    ctx.closePath(); ctx.fillStyle = murG; ctx.fill();
    // mur droit
    ctx.beginPath();
    ctx.moveTo(cx + hw, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx, cy + hh - haut); ctx.lineTo(cx + hw, cy - haut);
    ctx.closePath(); ctx.fillStyle = murD; ctx.fill();
    // toit
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh - haut); ctx.lineTo(cx + hw, cy - haut); ctx.lineTo(cx, cy + hh - haut); ctx.lineTo(cx - hw, cy - haut);
    ctx.closePath(); ctx.fillStyle = toit; ctx.fill();
    if (bord) {
      ctx.strokeStyle = bord; ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function fenetres(ctx, cx, cy, w, h, haut, etages, allume) {
    const hw = w / 2, hh = h / 2;
    for (let e = 0; e < etages; e++) {
      const y0 = cy - (e + 0.62) * (haut / Math.max(1, etages));
      for (let k = 0; k < 2; k++) {
        const t = 0.2 + k * 0.4;
        // face gauche
        const lx = cx - hw + t * hw, ly = y0 + (t) * hh;
        ctx.fillStyle = allume ? "rgba(255,236,160,0.95)" : "rgba(40,70,100,0.75)";
        ctx.beginPath();
        ctx.moveTo(lx, ly); ctx.lineTo(lx + hw * 0.18, ly + hh * 0.18);
        ctx.lineTo(lx + hw * 0.18, ly + hh * 0.18 - 4); ctx.lineTo(lx, ly - 4);
        ctx.closePath(); ctx.fill();
        // face droite
        const rx = cx + t * hw, ry = y0 + hh - t * hh;
        ctx.fillStyle = allume ? "rgba(255,230,140,0.85)" : "rgba(30,56,84,0.8)";
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

  /* dessine un batiment dont la base est centree en (0,0) */
  function dessinerBatiment(ctx, cle, niv, t, apercu) {
    const m = CAT[cle];
    const [c1, c2] = m.teinte || ["#ccc", "#999"];
    const W = TW * 0.86, Hh = TH * 0.86;
    const etage = 12;
    const haut = m.h * etage;

    // ombre portee
    if (m.h > 0) {
      ctx.fillStyle = "rgba(0,0,0,0.20)";
      ctx.beginPath();
      ctx.moveTo(0 + W * 0.5, 0);
      ctx.lineTo(W * 0.5 + haut * 0.55, haut * 0.28);
      ctx.lineTo(haut * 0.55, Hh * 0.5 + haut * 0.28);
      ctx.lineTo(0, Hh * 0.5);
      ctx.closePath(); ctx.fill();
    }

    switch (cle) {
      case "maison": {
        prisme(ctx, 0, 0, W * 0.8, Hh * 0.8, haut, eclaircir(c1, -0.12), eclaircir(c1, -0.28), eclaircir(c1, 0.05));
        // toit en pente
        const hw = W * 0.4 + 3, hh = Hh * 0.4 + 2;
        ctx.fillStyle = eclaircir(c2, -0.1);
        ctx.beginPath(); ctx.moveTo(-hw, -haut); ctx.lineTo(0, -haut - hh - 9); ctx.lineTo(0, -haut + hh - 9 + 9); ctx.lineTo(-hw + 0, -haut + 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = eclaircir(c2, -0.32);
        ctx.beginPath(); ctx.moveTo(hw, -haut); ctx.lineTo(0, -haut - hh - 9); ctx.lineTo(0, -haut + hh); ctx.closePath(); ctx.fill();
        ctx.fillStyle = eclaircir(c2, 0.1);
        ctx.beginPath(); ctx.moveTo(-hw, -haut); ctx.lineTo(0, -haut - hh - 9); ctx.lineTo(hw, -haut); ctx.lineTo(0, -haut + hh); ctx.closePath(); ctx.fill();
        fenetres(ctx, 0, 0, W * 0.8, Hh * 0.8, haut, 1, etat.nuit);
        break;
      }
      case "villa": {
        prisme(ctx, 0, 0, W * 0.86, Hh * 0.86, haut, eclaircir(c1, -0.1), eclaircir(c1, -0.24), eclaircir(c1, 0.08));
        prisme(ctx, 6, -haut, W * 0.4, Hh * 0.4, 8, eclaircir(c2, -0.1), eclaircir(c2, -0.3), eclaircir(c2, 0.2));
        fenetres(ctx, 0, 0, W * 0.86, Hh * 0.86, haut, 1, etat.nuit);
        // piscine
        ctx.fillStyle = "rgba(60,190,230,0.9)";
        losange(ctx, -W * 0.28, Hh * 0.22, W * 0.26, Hh * 0.26, "rgba(60,190,230,0.9)");
        break;
      }
      case "immeuble": {
        prisme(ctx, 0, 0, W * 0.84, Hh * 0.84, haut, eclaircir(c1, -0.1), eclaircir(c1, -0.26), eclaircir(c2, 0.12));
        fenetres(ctx, 0, 0, W * 0.84, Hh * 0.84, haut, 4, etat.nuit);
        prisme(ctx, 0, -haut, W * 0.5, Hh * 0.5, 6, "#8d8579", "#6d675d", "#a9a193");
        break;
      }
      case "tour": {
        prisme(ctx, 0, 0, W * 0.74, Hh * 0.74, haut, eclaircir(c1, -0.08), eclaircir(c1, -0.3), eclaircir(c2, 0.2));
        fenetres(ctx, 0, 0, W * 0.74, Hh * 0.74, haut, 9, etat.nuit);
        prisme(ctx, 0, -haut, W * 0.36, Hh * 0.36, 10, c2, eclaircir(c2, -0.3), eclaircir(c2, 0.3));
        ctx.strokeStyle = "#ddd"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(0, -haut - 12); ctx.lineTo(0, -haut - 28); ctx.stroke();
        ctx.fillStyle = (Math.floor(t * 2) % 2) ? "#ff4d4d" : "#7a1e1e";
        ctx.beginPath(); ctx.arc(0, -haut - 28, 2, 0, 6.283); ctx.fill();
        break;
      }
      case "gratte": {
        prisme(ctx, 0, 0, W * 0.7, Hh * 0.7, haut, eclaircir(c1, -0.12), eclaircir(c1, -0.34), eclaircir(c2, 0.28));
        fenetres(ctx, 0, 0, W * 0.7, Hh * 0.7, haut, 14, etat.nuit);
        prisme(ctx, 0, -haut, W * 0.46, Hh * 0.46, 16, eclaircir(c1, -0.04), eclaircir(c1, -0.28), eclaircir(c2, 0.3));
        prisme(ctx, 0, -haut - 16, W * 0.22, Hh * 0.22, 14, eclaircir(c1, 0.05), eclaircir(c1, -0.2), "#fff");
        ctx.strokeStyle = "#eee"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(0, -haut - 32); ctx.lineTo(0, -haut - 52); ctx.stroke();
        ctx.fillStyle = (Math.floor(t * 2) % 2) ? "#ff4d4d" : "#7a1e1e";
        ctx.beginPath(); ctx.arc(0, -haut - 52, 2.3, 0, 6.283); ctx.fill();
        break;
      }
      case "boutique": {
        prisme(ctx, 0, 0, W * 0.84, Hh * 0.84, haut, eclaircir(c1, -0.1), eclaircir(c1, -0.26), eclaircir(c1, 0.12));
        // auvent rayé
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
      case "hotel": {
        prisme(ctx, 0, 0, W * 0.8, Hh * 0.8, haut, eclaircir(c1, -0.08), eclaircir(c1, -0.26), eclaircir(c2, 0.1));
        fenetres(ctx, 0, 0, W * 0.8, Hh * 0.8, haut, 6, etat.nuit);
        ctx.fillStyle = "#f5cf1b";
        ctx.font = "bold 8px system-ui"; ctx.textAlign = "center";
        ctx.fillText("HOTEL", -W * 0.18, -haut * 0.55);
        break;
      }
      case "port": {
        // ponton en bois
        prisme(ctx, 0, 4, W * 0.9, Hh * 0.9, 4, "#6a4f33", "#4b3825", "#a88455");
        ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 1;
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 9 - 6, -2); ctx.lineTo(i * 9 + 6, 7); ctx.stroke(); }
        // petit voilier
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -30); ctx.lineTo(14, -6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#e8372f"; ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-2, -24); ctx.lineTo(-12, -6); ctx.closePath(); ctx.fill();
        break;
      }
      case "plage_b": {
        prisme(ctx, 0, 0, W * 0.7, Hh * 0.7, haut, "#f6ecd0", "#cdbf9c", c2);
        ctx.fillStyle = c2;
        ctx.beginPath(); ctx.moveTo(-W * 0.38, -haut + 2); ctx.lineTo(0, -haut - Hh * 0.38); ctx.lineTo(W * 0.38, -haut + 2); ctx.lineTo(0, -haut + Hh * 0.38 + 2); ctx.closePath(); ctx.fill();
        arbre(ctx, W * 0.34, Hh * 0.2, 7, true);
        break;
      }
      case "parasol": {
        for (let i = 0; i < 2; i++) {
          const px = i ? 12 : -12, py = i ? 6 : -4;
          ctx.strokeStyle = "#6b5a40"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 16); ctx.stroke();
          ctx.fillStyle = i ? c1 : c2;
          ctx.beginPath(); ctx.ellipse(px, py - 16, 12, 5, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.beginPath(); ctx.ellipse(px - 3, py - 17, 4, 1.8, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
          losange(ctx, px + 6, py + 6, 16, 7, "#2a9bd1");
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
        ctx.fillStyle = "#3a3d46"; ctx.beginPath(); ctx.arc(0, cyr, 3.5, 0, 6.283); ctx.fill();
        break;
      }
      case "parc": {
        losange(ctx, 0, 0, W * 0.96, Hh * 0.96, "#5bb04a");
        losange(ctx, 0, 0, W * 0.6, Hh * 0.6, "#6bc258");
        arbre(ctx, -W * 0.22, -2, 11, false);
        arbre(ctx, W * 0.2, 4, 9, false);
        ctx.fillStyle = "#f4a3c0";
        for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-6 + i * 4, 8 + (i % 2) * 2, 1.4, 0, 6.283); ctx.fill(); }
        break;
      }
      case "ecole": {
        prisme(ctx, 0, 0, W * 0.9, Hh * 0.9, haut, eclaircir(c1, -0.08), eclaircir(c1, -0.26), c2);
        fenetres(ctx, 0, 0, W * 0.9, Hh * 0.9, haut, 2, etat.nuit);
        ctx.strokeStyle = "#888"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(0, -haut - 2); ctx.lineTo(0, -haut - 16); ctx.stroke();
        ctx.fillStyle = "#ce1126"; ctx.fillRect(0, -haut - 16, 5, 3);
        ctx.fillStyle = "#fcd116"; ctx.fillRect(5, -haut - 16, 5, 3);
        ctx.fillStyle = "#009460"; ctx.fillRect(10, -haut - 16, 5, 3);
        break;
      }
      case "hopital": {
        prisme(ctx, 0, 0, W * 0.88, Hh * 0.88, haut, "#ececea", "#c6c6c2", "#f7f7f5");
        fenetres(ctx, 0, 0, W * 0.88, Hh * 0.88, haut, 3, etat.nuit);
        ctx.fillStyle = "#d11231";
        ctx.fillRect(-3, -haut - 1, 6, 14 * 0.0 + 1);
        ctx.fillRect(-1.5, -haut + 2, 3, 9); ctx.fillRect(-5, -haut + 5, 10, 3);
        break;
      }
      case "gare": {
        prisme(ctx, 0, 0, W * 0.94, Hh * 0.94, haut, eclaircir(c1, -0.06), eclaircir(c1, -0.24), c2);
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.beginPath(); ctx.arc(0, -haut + 4, 9, Math.PI, 0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#555"; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(-W * 0.4, Hh * 0.2); ctx.lineTo(W * 0.38, Hh * 0.2 - 14); ctx.stroke();
        break;
      }
      default: {
        prisme(ctx, 0, 0, W * 0.84, Hh * 0.84, Math.max(8, haut), c1, eclaircir(c1, -0.2), c2);
      }
    }
  }

  /* ------------------------------ sol et routes ------------------------------ */
  let sol = null;       // canvas pre-rendu du terrain
  let solOrigine = { x: 0, y: 0 };

  function genererSol() {
    const r = prng(777);
    const ext = N * TW;
    const c = document.createElement("canvas");
    const marge = 280;
    c.width = ext + marge * 2;
    c.height = N * TH + marge * 2;
    const g = c.getContext("2d");
    g.translate(marge + ext / 2, marge);
    solOrigine = { x: marge + ext / 2, y: marge };

    // mer de fond
    g.fillStyle = "#1a8fc4";
    g.fillRect(-ext, -marge, ext * 2, c.height);

    // cases
    for (let s = 0; s <= 2 * (N - 1); s++) {
      for (let x = 0; x < N; x++) {
        const y = s - x;
        if (y < 0 || y >= N) continue;
        const p = iso(x, y);
        const ty = typeSol(x, y);
        let col;
        if (ty === 2) {
          const k = (x * 7 + y * 13) % 5;
          col = ["#2aa6d8", "#2fadde", "#2499cc", "#33b2e0", "#289fd1"][k];
        } else if (ty === 1) {
          col = (x + y) % 2 ? "#f0d9a0" : "#ecd397";
        } else {
          col = (x + y) % 2 ? "#6cbf4b" : "#66b947";
        }
        losange(g, p.x, p.y, TW + 1, TH + 1, col);
        if (ty === 2) {
          // reflets
          if (r() < 0.18) {
            g.strokeStyle = "rgba(255,255,255,0.22)"; g.lineWidth = 1.2;
            g.beginPath(); g.moveTo(p.x - 8, p.y); g.lineTo(p.x + 6, p.y); g.stroke();
          }
        }
        if (ty === 0 && r() < 0.22) {
          g.fillStyle = "rgba(255,255,255,0.07)";
          g.beginPath(); g.arc(p.x + (r() - 0.5) * 20, p.y + (r() - 0.5) * 8, 2 + r() * 3, 0, 6.283); g.fill();
        }
      }
    }
    // ecume le long de la plage
    for (let s = 0; s <= 2 * (N - 1); s++) {
      for (let x = 0; x < N; x++) {
        const y = s - x;
        if (y < 0 || y >= N) continue;
        if (typeSol(x, y) !== 2) continue;
        const voisins = [[1, 0], [0, 1], [-1, 0], [0, -1]];
        for (const [dx, dy] of voisins) {
          const tx = x + dx, ty2 = y + dy;
          if (tx < 0 || ty2 < 0 || tx >= N || ty2 >= N) continue;
          if (typeSol(tx, ty2) === 1) {
            const p = iso(x, y), q = iso(tx, ty2);
            g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 2;
            g.beginPath(); g.moveTo((p.x + q.x) / 2 - 8, (p.y + q.y) / 2); g.lineTo((p.x + q.x) / 2 + 8, (p.y + q.y) / 2); g.stroke();
          }
        }
      }
    }
    // bordure de la carte : falaise
    sol = c;
  }

  // dessine une case de route avec raccords
  function dessinerRoute(ctx, x, y) {
    const n = !!(G(x, y - 1) && G(x, y - 1).cle === "route");
    const s = !!(G(x, y + 1) && G(x, y + 1).cle === "route");
    const o = !!(G(x - 1, y) && G(x - 1, y).cle === "route");
    const e = !!(G(x + 1, y) && G(x + 1, y).cle === "route");
    losange(ctx, 0, 0, TW + 1, TH + 1, "#4c525c");
    ctx.strokeStyle = "rgba(240,240,230,0.6)"; ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    // axes iso : n = haut-droite... (x-1 -> haut-gauche, y-1 -> haut-droite)
    if (o) { ctx.moveTo(0, 0); ctx.lineTo(-TW / 4, -TH / 4); }
    if (n) { ctx.moveTo(0, 0); ctx.lineTo(TW / 4, -TH / 4); }
    if (e) { ctx.moveTo(0, 0); ctx.lineTo(TW / 4, TH / 4); }
    if (s) { ctx.moveTo(0, 0); ctx.lineTo(-TW / 4, TH / 4); }
    ctx.stroke();
    ctx.setLineDash([]);
    // bordures de trottoir
    ctx.strokeStyle = "rgba(210,205,190,0.85)"; ctx.lineWidth = 2.2;
    const hw = TW / 2, hh = TH / 2;
    ctx.beginPath();
    if (!o && !n) {}            // coin haut
    // haut-gauche : cote entre (0,-hh) et (-hw,0) => voisin x-1
    if (!o) { ctx.moveTo(0, -hh + 1); ctx.lineTo(-hw + 2, 0); }
    // haut-droite : voisin y-1
    if (!n) { ctx.moveTo(0, -hh + 1); ctx.lineTo(hw - 2, 0); }
    // bas-droite : voisin x+1
    if (!e) { ctx.moveTo(hw - 2, 0); ctx.lineTo(0, hh - 1); }
    // bas-gauche : voisin y+1
    if (!s) { ctx.moveTo(-hw + 2, 0); ctx.lineTo(0, hh - 1); }
    ctx.stroke();
  }

  /* ------------------------------ vegetation decorative ------------------------------ */
  const deco = [];
  function genererDeco() {
    deco.length = 0;
    const r = prng(4242);
    for (let i = 0; i < 160; i++) {
      const x = Math.floor(r() * N), y = Math.floor(r() * N);
      const ty = typeSol(x, y);
      if (ty === 2) continue;
      deco.push({ x, y, ox: (r() - 0.5) * 0.7, oy: (r() - 0.5) * 0.7, palmier: ty === 1, s: 8 + r() * 6 });
    }
  }

  /* ------------------------------ construction ------------------------------ */
  function peutPoser(cle, x, y) {
    const m = CAT[cle];
    if (x < 0 || y < 0 || x >= N || y >= N) return "Hors de la ville";
    if (G(x, y)) return "Case occupée";
    const ty = typeSol(x, y);
    if (m.mer) {
      if (ty !== 1) return "À poser sur la plage, côté mer";
      return null;
    }
    if (ty === 2) return "On ne construit pas sur l'eau";
    if (m.plage && ty !== 1) return "À poser sur la plage";
    if (!m.plage && ty === 1 && cle !== "route" && cle !== "parc") return "La plage est réservée aux loisirs";
    if (cle !== "route" && cle !== "parc" && cle !== "parasol") {
      // doit toucher une route
      let ok = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const v = G(x + dx, y + dy);
        if (v && v.cle === "route") ok = true;
      }
      if (!ok) return "Il faut une route à côté";
    }
    return null;
  }

  function poser(cle, x, y, silence) {
    const m = CAT[cle];
    const refus = peutPoser(cle, x, y);
    if (refus) { if (!silence) { bulle(refus); son(180, 0.12, "square", 0.05); } return false; }
    if (m.niveauReq > etat.niveau) { if (!silence) bulle("Débloqué au niveau " + m.niveauReq); return false; }
    if (etat.argent < m.cout) { if (!silence) { bulle("Il te manque " + fmt(m.cout - etat.argent) + " $"); son(180, 0.12, "square", 0.05); } return false; }
    etat.argent -= m.cout;
    const b = { cle, niv: 1, x, y, nee: etat.temps, total: m.cout };
    etat.grille[y * N + x] = b;
    etat.batiments.push(b);
    gagnerXp(Math.max(2, Math.round(m.cout / 18)));
    recalculer();
    son(m.h > 3 ? 360 : 520, 0.09, "triangle", 0.07);
    etat.modifie = true;
    const p = iso(x, y);
    flottant("-" + fmt(m.cout), p.x, p.y - 10, "#ffd2da");
    return true;
  }

  function demolir(b) {
    etat.argent += Math.round(b.total * 0.5);
    etat.grille[b.y * N + b.x] = null;
    etat.batiments = etat.batiments.filter((x) => x !== b);
    if (etat.selection === b) fermerInfo();
    recalculer();
    son(120, 0.18, "sawtooth", 0.07);
    etat.modifie = true;
    const p = iso(b.x, b.y);
    flottant("+" + fmt(b.total * 0.5), p.x, p.y - 10, "#9fe0a8");
  }

  function gagnerXp(n) {
    etat.xp += n;
    let besoin = XP_NIVEAU(etat.niveau);
    while (etat.xp >= besoin) {
      etat.xp -= besoin;
      etat.niveau += 1;
      etat.argent += 300 * etat.niveau;
      bulle("Niveau " + etat.niveau + " ! Bonus " + fmt(300 * etat.niveau) + " $");
      son(660, 0.2, "triangle", 0.1); setTimeout(() => son(880, 0.25, "triangle", 0.1), 130);
      construireDock();
      besoin = XP_NIVEAU(etat.niveau);
    }
  }

  function niveauBat(b) { return b.niv; }
  function revenuBat(b) {
    const m = CAT[b.cle];
    return m.rev * (1 + (b.niv - 1) * 0.6);
  }
  function coutAmelio(b) { return Math.round(CAT[b.cle].cout * 0.8 * b.niv); }

  function recalculer() {
    let hab = 0, rev = 0, bonus = 0, nbHab = 0;
    for (const b of etat.batiments) {
      const m = CAT[b.cle];
      hab += m.hab * (1 + (b.niv - 1) * 0.5);
      bonus += (m.bonheur || 0);
      rev += revenuBat(b);
      if (m.hab) nbHab++;
    }
    etat.habitants = Math.round(hab);
    // bonheur : services par rapport aux habitants
    const besoin = Math.max(1, etat.habitants / 25);
    const ratio = clamp(bonus / besoin, 0, 1.4);
    etat.bonheur = etat.habitants === 0 ? 100 : Math.round(clamp(55 + ratio * 45, 40, 100));
    const mult = 0.6 + (etat.bonheur / 100) * 0.4;
    etat.revenuSec = rev * mult;
  }

  /* ------------------------------ interface ------------------------------ */
  let bulleTimer = null;
  function bulle(txt) {
    const b = $("#bulle");
    b.textContent = txt;
    b.classList.remove("cache");
    clearTimeout(bulleTimer);
    bulleTimer = setTimeout(() => b.classList.add("cache"), 2200);
  }

  function flottant(txt, x, y, col) {
    etat.flottants.push({ txt, x, y, t: 0, col });
  }

  function majHud() {
    $("#h-niveau").textContent = etat.niveau;
    $("#h-hab").textContent = fmt(etat.habitants);
    $("#h-bonheur").textContent = etat.bonheur + "%";
    $("#h-argent").textContent = fmt(etat.argent);
    $("#h-revenu").textContent = "+" + etat.revenuSec.toFixed(1) + "/s";
    $("#h-xp").style.width = Math.round(100 * etat.xp / XP_NIVEAU(etat.niveau)) + "%";
    document.querySelectorAll(".bat").forEach((el) => {
      const cle = el.dataset.cle;
      const m = CAT[cle];
      el.classList.toggle("pauvre", etat.argent < m.cout && m.niveauReq <= etat.niveau);
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
        const premier = Object.keys(CAT).find((k) => CAT[k].onglet === id);
        etat.choix = premier;
        etat.gomme = false;
        $("#btn-gomme").classList.remove("actif");
        construireOnglets(); construireDock();
      });
      box.appendChild(b);
    }
  }

  function vignette(cle) {
    const cv = document.createElement("canvas");
    cv.width = 120; cv.height = 80;
    const g = cv.getContext("2d");
    g.translate(60, 56);
    if (cle === "route") {
      losange(g, 0, 0, TW * 0.9, TH * 0.9, "#4c525c");
      g.strokeStyle = "rgba(240,240,230,0.7)"; g.lineWidth = 2; g.setLineDash([5, 4]);
      g.beginPath(); g.moveTo(-18, -9); g.lineTo(18, 9); g.stroke(); g.setLineDash([]);
    } else {
      const m = CAT[cle];
      const sc = m.h > 8 ? 0.62 : m.h > 4 ? 0.8 : 1;
      g.scale(sc, sc);
      g.translate(0, m.h > 8 ? 12 : 0);
      dessinerBatiment(g, cle, 1, 0, true);
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
      el.className = "bat" + (cle === etat.choix && !etat.gomme ? " choisi" : "") + (m.niveauReq > etat.niveau ? " verrou" : "");
      el.dataset.cle = cle;
      el.appendChild(vignette(cle));
      const nom = document.createElement("div"); nom.className = "nom"; nom.textContent = m.nom;
      const prix = document.createElement("div"); prix.className = "prix";
      prix.textContent = m.niveauReq > etat.niveau ? "🔒 Niv " + m.niveauReq : "$ " + fmt(m.cout);
      el.appendChild(nom); el.appendChild(prix);
      el.addEventListener("click", () => {
        if (m.niveauReq > etat.niveau) { bulle("Débloqué au niveau " + m.niveauReq); return; }
        etat.choix = cle; etat.gomme = false;
        $("#btn-gomme").classList.remove("actif");
        fermerInfo();
        construireDock();
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
    $("#i-desc").textContent = parts.join(" · ") || "Élément de décor de la ville.";
    const canUp = b.cle !== "route" && b.niv < 3 && (m.rev || m.hab || m.bonheur);
    const cout = coutAmelio(b);
    $("#i-ameliorer").style.display = canUp ? "block" : "none";
    $("#i-ameliorer").textContent = "Améliorer · $" + fmt(cout);
    $("#i-ameliorer").disabled = etat.argent < cout;
    $("#info").classList.remove("cache");
  }
  function fermerInfo() { etat.selection = null; $("#info").classList.add("cache"); }

  /* ------------------------------ sauvegarde ------------------------------ */
  function sauver() {
    try {
      const data = {
        argent: etat.argent, xp: etat.xp, niveau: etat.niveau,
        bat: etat.batiments.map((b) => [b.cle, b.x, b.y, b.niv, b.total]),
        t: Date.now(),
      };
      localStorage.setItem(SAVE, JSON.stringify(data));
    } catch (e) {}
  }
  function lire() {
    try { return JSON.parse(localStorage.getItem(SAVE) || "null"); } catch (e) { return null; }
  }
  function charger(data) {
    etat.argent = data.argent; etat.xp = data.xp; etat.niveau = data.niveau;
    etat.grille.fill(null); etat.batiments = [];
    for (const [cle, x, y, niv, total] of data.bat) {
      if (!CAT[cle]) continue;
      const b = { cle, x, y, niv, total, nee: -99 };
      etat.grille[y * N + x] = b; etat.batiments.push(b);
    }
    // gains hors ligne : 50% du revenu, 2 h max
    recalculer();
    const sec = clamp((Date.now() - (data.t || Date.now())) / 1000, 0, 7200);
    const gain = Math.floor(etat.revenuSec * sec * 0.5);
    if (gain > 5) { etat.argent += gain; setTimeout(() => bulle("Pendant ton absence : +" + fmt(gain) + " $"), 700); }
  }
  function nouvelleVille() {
    etat.argent = 1500; etat.xp = 0; etat.niveau = 1;
    etat.grille.fill(null); etat.batiments = [];
    // petit quartier de depart
    const c = Math.floor(N / 2) - 4;
    for (let i = 0; i < 9; i++) {
      const g = { cle: "route", x: c + i, y: c + 2, niv: 1, total: 8, nee: -99 };
      etat.grille[g.y * N + g.x] = g; etat.batiments.push(g);
    }
    for (let j = 0; j < 5; j++) {
      const g = { cle: "route", x: c + 4, y: c + 2 + j, niv: 1, total: 8, nee: -99 };
      if (!etat.grille[g.y * N + g.x]) { etat.grille[g.y * N + g.x] = g; etat.batiments.push(g); }
    }
    const dep = [["maison", c + 1, c + 1], ["maison", c + 3, c + 1], ["boutique", c + 5, c + 1], ["maison", c + 6, c + 3]];
    for (const [cle, x, y] of dep) {
      const b = { cle, x, y, niv: 1, total: CAT[cle].cout, nee: -99 };
      etat.grille[y * N + x] = b; etat.batiments.push(b);
    }
    recalculer();
  }

  function statsAccueil() {
    const d = lire();
    $("#a-niveau").textContent = d ? d.niveau : 1;
    $("#a-bat").textContent = d ? d.bat.filter((b) => b[0] !== "route").length : 0;
    let hab = 0;
    if (d) for (const b of d.bat) { const m = CAT[b[0]]; if (m) hab += m.hab * (1 + (b[3] - 1) * 0.5); }
    $("#a-hab").textContent = fmt(hab);
  }

  /* ------------------------------ vie de la ville ------------------------------ */
  function routeCases() { return etat.batiments.filter((b) => b.cle === "route"); }

  function majVoitures(dt) {
    const routes = routeCases();
    const cible = clamp(Math.floor(routes.length / 2.5), 0, 28);
    while (etat.voitures.length < cible) {
      const r = routes[(Math.random() * routes.length) | 0];
      if (!r) break;
      etat.voitures.push({
        gx: r.x, gy: r.y, tx: r.x, ty: r.y, t: 1, v: 0.9 + Math.random() * 0.8,
        coul: ["#e8372f", "#f5cf1b", "#3b8fb8", "#f4f4f0", "#2f9a58", "#ef7f2e", "#222"][(Math.random() * 7) | 0],
        px: r.x, py: r.y,
      });
    }
    while (etat.voitures.length > cible + 2) etat.voitures.pop();
    for (const v of etat.voitures) {
      v.t += dt * v.v * 1.6;
      if (v.t >= 1) {
        v.gx = v.tx; v.gy = v.ty; v.t = 0;
        const here = G(v.gx, v.gy);
        if (!here || here.cle !== "route") {
          const r = routes[(Math.random() * routes.length) | 0];
          if (r) { v.gx = r.x; v.gy = r.y; } else continue;
        }
        const opts = [];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = G(v.gx + dx, v.gy + dy);
          if (n && n.cle === "route") opts.push([v.gx + dx, v.gy + dy]);
        }
        if (opts.length) {
          // evite le demi-tour
          const ahead = opts.filter(([x, y]) => !(x === v.px && y === v.py));
          const pick = (ahead.length ? ahead : opts)[(Math.random() * (ahead.length ? ahead.length : opts.length)) | 0];
          v.px = v.gx; v.py = v.gy;
          v.tx = pick[0]; v.ty = pick[1];
        } else { v.tx = v.gx; v.ty = v.gy; }
      }
    }
  }

  function majMeteo(dt) {
    if (etat.nuages.length < 5) {
      etat.nuages.push({ x: -700 + Math.random() * 1400, y: -300 + Math.random() * 600, v: 6 + Math.random() * 9, s: 0.7 + Math.random() * 0.9 });
    }
    for (const n of etat.nuages) { n.x += n.v * dt; }
    etat.nuages = etat.nuages.filter((n) => n.x < 1100);
    if (etat.bateaux.length < 3) {
      const p = iso(N * 0.82 + Math.random() * 4, N * 0.9 + Math.random() * 6);
      etat.bateaux.push({ x: p.x, y: p.y, v: (Math.random() < 0.5 ? -1 : 1) * (7 + Math.random() * 6), c: ["#fff", "#e8372f", "#f5cf1b"][(Math.random() * 3) | 0] });
    }
    for (const b of etat.bateaux) { b.x += b.v * dt; b.y += b.v * dt * 0.5; }
    etat.bateaux = etat.bateaux.filter((b) => Math.abs(b.x) < 1400 && b.y < N * TH + 200 && b.y > 0);
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

  let survol = null;   // case sous le doigt (apercu)

  function dessiner() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, L, Hc);
    // ciel / mer lointaine
    const fond = ctx.createLinearGradient(0, 0, 0, Hc);
    fond.addColorStop(0, "#0d5a84"); fond.addColorStop(1, "#0a4468");
    ctx.fillStyle = fond; ctx.fillRect(0, 0, L, Hc);

    ctx.save();
    ctx.translate(L / 2, Hc / 2);
    ctx.scale(camV.z, camV.z);
    ctx.translate(-camV.x, -camV.y);

    // terrain pre-rendu
    if (sol) ctx.drawImage(sol, -solOrigine.x, -solOrigine.y);

    // bateaux au loin
    for (const b of etat.bateaux) {
      ctx.save(); ctx.translate(b.x, b.y);
      ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(2, 5, 16, 5, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = "#f4f4f0"; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(14, 0); ctx.lineTo(9, 7); ctx.lineTo(-10, 7); ctx.closePath(); ctx.fill();
      ctx.fillStyle = b.c; ctx.fillRect(-14, 0, 28, 2);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(1, -2); ctx.lineTo(1, -24); ctx.lineTo(13, -4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // objets tries par profondeur
    const liste = [];
    for (const b of etat.batiments) liste.push({ prof: b.x + b.y + 0.5, type: "b", b });
    for (const d of deco) {
      if (G(Math.floor(d.x), Math.floor(d.y))) continue;
      liste.push({ prof: d.x + d.y + 0.2, type: "d", d });
    }
    for (const v of etat.voitures) {
      const fx = v.gx + (v.tx - v.gx) * v.t, fy = v.gy + (v.ty - v.gy) * v.t;
      liste.push({ prof: fx + fy + 0.6, type: "v", v, fx, fy });
    }
    liste.sort((a, b) => a.prof - b.prof);

    // routes d'abord (au ras du sol)
    for (const b of etat.batiments) {
      if (b.cle !== "route") continue;
      const p = iso(b.x, b.y);
      ctx.save(); ctx.translate(p.x, p.y);
      dessinerRoute(ctx, b.x, b.y);
      ctx.restore();
    }

    for (const o of liste) {
      if (o.type === "b") {
        const b = o.b;
        if (b.cle === "route") continue;
        const p = iso(b.x, b.y);
        const age = etat.temps - b.nee;
        let sc = 1, dy = 0;
        if (age < 0.45) { const u = age / 0.45; sc = 0.6 + 0.4 * (1 - Math.pow(1 - u, 3)) + Math.sin(u * 3.14) * 0.1; dy = (1 - u) * -6; }
        ctx.save(); ctx.translate(p.x, p.y + dy); ctx.scale(sc, sc);
        // dalle sous les gros batiments
        if (CAT[b.cle].h > 0 && b.cle !== "port") losange(ctx, 0, 0, TW * 0.98, TH * 0.98, "#b9b4a2");
        if (b.cle === "port") losange(ctx, 0, 0, TW * 0.2, TH * 0.2, "rgba(0,0,0,0)");
        dessinerBatiment(ctx, b.cle, b.niv, etat.temps, false);
        if (b.niv > 1) {
          ctx.fillStyle = "#f5cf1b"; ctx.font = "bold 10px system-ui"; ctx.textAlign = "center";
          ctx.fillText("★".repeat(b.niv - 1), 0, -CAT[b.cle].h * 12 - 8);
        }
        if (etat.selection === b) {
          ctx.strokeStyle = "#f5cf1b"; ctx.lineWidth = 2.4;
          losange(ctx, 0, 0, TW * 1.02, TH * 1.02, "rgba(245,207,27,0.18)", "#f5cf1b");
        }
        ctx.restore();
      } else if (o.type === "d") {
        const d = o.d;
        const p = iso(d.x + 0.5 + d.ox, d.y + 0.5 + d.oy);
        arbre(ctx, p.x, p.y, d.s, d.palmier);
      } else if (o.type === "v") {
        const p = iso(o.fx, o.fy);
        const dx = o.v.tx - o.v.gx, dy2 = o.v.ty - o.v.gy;
        const ang = Math.atan2((dx + dy2) * TH / 2, (dx - dy2) * TW / 2);
        ctx.save(); ctx.translate(p.x, p.y - 1); ctx.rotate(ang);
        ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(-7, -1, 14, 6);
        ctx.fillStyle = o.v.coul; ctx.fillRect(-7, -4, 14, 6);
        ctx.fillStyle = "rgba(200,230,250,0.9)"; ctx.fillRect(-2, -3.5, 5, 5);
        ctx.restore();
      }
    }

    // apercu de pose
    if (survol && !etat.gomme && etat.ecran === "jeu") {
      const m = CAT[etat.choix];
      const p = iso(survol.x, survol.y);
      const refus = peutPoser(etat.choix, survol.x, survol.y);
      ctx.save(); ctx.translate(p.x, p.y);
      losange(ctx, 0, 0, TW, TH, refus ? "rgba(229,72,77,0.5)" : "rgba(91,227,125,0.45)", refus ? "#e5484d" : "#5be37d");
      ctx.globalAlpha = 0.72;
      if (etat.choix === "route") losange(ctx, 0, 0, TW * 0.9, TH * 0.9, "#4c525c");
      else dessinerBatiment(ctx, etat.choix, 1, etat.temps, true);
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

    // nuages (ombre sur la ville)
    for (const n of etat.nuages) {
      ctx.fillStyle = "rgba(0,20,40,0.07)";
      ctx.beginPath(); ctx.ellipse(n.x, n.y, 150 * n.s, 55 * n.s, 0, 0, 6.283); ctx.fill();
    }

    ctx.restore();

    // vignette douce
    const vg = ctx.createRadialGradient(L / 2, Hc / 2, Math.min(L, Hc) * 0.4, L / 2, Hc / 2, Math.max(L, Hc) * 0.8);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,12,24,0.38)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, L, Hc);
  }

  /* ------------------------------ boucle ------------------------------ */
  let dernier = 0, accumSauve = 0, accumHud = 0, accumFlot = 0;
  function boucle(t) {
    const dt = Math.min(0.05, (t - dernier) / 1000 || 0.016);
    dernier = t;
    const k = Math.min(1, dt * 12);
    camV.x += (cam.x - camV.x) * k;
    camV.y += (cam.y - camV.y) * k;
    camV.z += (cam.z - camV.z) * k;

    if (etat.ecran === "jeu") {
      etat.temps += dt;
      etat.argent += etat.revenuSec * dt;
      majVoitures(dt);
      majMeteo(dt);
      for (const f of etat.flottants) f.t += dt;
      etat.flottants = etat.flottants.filter((f) => f.t < 1.3);

      accumFlot += dt;
      if (accumFlot > 2.4 && etat.batiments.length) {
        accumFlot = 0;
        const gen = etat.batiments.filter((b) => CAT[b.cle].rev > 0);
        if (gen.length) {
          const b = gen[(Math.random() * gen.length) | 0];
          const p = iso(b.x, b.y);
          flottant("+" + fmt(revenuBat(b) * 2.4), p.x, p.y - CAT[b.cle].h * 12 - 10, "#ffe680");
        }
      }
      accumHud += dt;
      if (accumHud > 0.12) { accumHud = 0; majHud(); }
      accumSauve += dt;
      if (accumSauve > 6) { accumSauve = 0; if (etat.modifie) { sauver(); etat.modifie = false; } }
      dessiner();
    }
    requestAnimationFrame(boucle);
  }

  /* ------------------------------ entrees ------------------------------ */
  const pointeurs = new Map();
  let geste = null;
  let dernierePose = null;

  function posCanvas(ev) {
    const r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }

  canvas.addEventListener("pointerdown", (ev) => {
    if (etat.ecran !== "jeu") return;
    canvas.setPointerCapture(ev.pointerId);
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
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      cam.z = geste.z0 * (d / geste.d0);
      limiterCam();
      return;
    }
    const dx = p.x - geste.x0, dy = p.y - geste.y0;
    if (!geste.bouge && Math.hypot(dx, dy) > 9) geste.bouge = true;
    if (geste.bouge) {
      cam.x = geste.cx - dx / camV.z;
      cam.y = geste.cy - dy / camV.z;
      limiterCam();
      camV.x = cam.x; camV.y = cam.y;
      survol = null;
    } else {
      survol = versCase(p.x, p.y);
    }
  });

  function fin(ev) {
    const g = geste;
    const p = posCanvas(ev);
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
    const b = G(c.x, c.y);
    if (etat.gomme) {
      if (b) demolir(b); else bulle("Rien à démolir ici");
      return;
    }
    if (b && b.cle !== "route") {
      // toucher un batiment existant => infos
      ouvrirInfo(b);
      return;
    }
    fermerInfo();
    if (!b) poser(etat.choix, c.x, c.y);
    else if (b && etat.choix !== "route") bulle("Case occupée");
  }

  /* ------------------------------ boutons ------------------------------ */
  $("#btn-zoom-plus").addEventListener("click", () => { cam.z *= 1.3; limiterCam(); });
  $("#btn-zoom-moins").addEventListener("click", () => { cam.z /= 1.3; limiterCam(); });
  $("#btn-vue").addEventListener("click", recentrer);
  $("#btn-gomme").addEventListener("click", () => {
    etat.gomme = !etat.gomme;
    $("#btn-gomme").classList.toggle("actif", etat.gomme);
    fermerInfo();
    bulle(etat.gomme ? "Mode démolition : touche un bâtiment" : "Mode construction");
    construireDock();
  });
  $("#btn-son").addEventListener("click", () => {
    etat.son = !etat.son;
    $("#btn-son").textContent = etat.son ? "🔊" : "🔇";
  });
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
    etat.modifie = true;
    ouvrirInfo(b);
  });

  function afficher(nom) {
    etat.ecran = nom;
    $("#accueil").classList.toggle("actif", nom === "accueil");
    $("#jeu").classList.toggle("actif", nom === "jeu");
    if (nom === "jeu") { redim(); }
  }

  $("#btn-jouer").addEventListener("click", () => {
    const d = lire();
    if (d) charger(d); else nouvelleVille();
    genererSol(); genererDeco();
    construireOnglets(); construireDock();
    afficher("jeu");
    redim(); recentrer();
    recalculer(); majHud();
    if (!d) bulle("Pose des maisons le long des routes pour faire grandir ta ville");
    son(520, 0.12, "triangle", 0.07);
  });

  $("#btn-reset").addEventListener("click", () => {
    if (confirm("Effacer toute ta ville et recommencer ?")) {
      try { localStorage.removeItem(SAVE); } catch (e) {}
      statsAccueil();
    }
  });

  window.addEventListener("resize", () => { if (etat.ecran === "jeu") { redim(); } });
  window.addEventListener("pagehide", () => { if (etat.batiments.length) sauver(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && etat.batiments.length) sauver(); });

  /* ------------------------------ pilote de test ------------------------------ */
  const AUTO = /auto=1/.test(location.search);
  window.__sim = etat;
  window.__simApi = { poser, recentrer, CAT, N, cam: camV, iso: (x, y) => iso(x, y), ecran: (gx, gy) => { const p = iso(gx + 0.5, gy + 0.5); return { x: (p.x - camV.x) * camV.z + L / 2, y: (p.y - camV.y) * camV.z + Hc / 2 }; } };

  function pilote() {
    // construit automatiquement un quartier pour verifier le rendu
    const c = Math.floor(N / 2) - 2;
    const plan = [];
    for (let i = -8; i <= 12; i++) plan.push(["route", c + i, c]);
    for (let j = -8; j <= 12; j++) plan.push(["route", c, c + j]);
    for (let i = -8; i <= 12; i++) plan.push(["route", c + i, c + 6]);
    for (let j = -8; j <= 12; j++) plan.push(["route", c + 6, c + j]);
    for (let i = -8; i <= 12; i++) plan.push(["route", c + i, c - 6]);
    etat.argent = 9e6; etat.niveau = 9;
    for (const [cle, x, y] of plan) poser(cle, x, y, true);

    // batiments le long des routes, du plus haut au plus bas pour le centre-ville
    const bats = [
      ["gratte", 1, 1], ["gratte", 2, 1], ["tour", 3, 1], ["tour", 4, 1], ["hotel", 5, 1],
      ["immeuble", 1, 2], ["immeuble", 2, 2], ["immeuble", 3, 2], ["hotel", 4, 2], ["boutique", 5, 2],
      ["gratte", 7, 1], ["tour", 8, 1], ["immeuble", 9, 1], ["immeuble", 10, 1],
      ["villa", 1, 5], ["villa", 2, 5], ["maison", 3, 5], ["maison", 4, 5], ["parc", 5, 5],
      ["marche", 7, 5], ["boutique", 8, 5], ["ecole", 9, 5], ["hopital", 10, 5],
      ["maison", -1, 1], ["maison", -2, 1], ["villa", -3, 1], ["maison", -4, 1], ["maison", -5, 1],
      ["maison", -1, -1], ["maison", -2, -1], ["villa", -3, -1], ["immeuble", -4, -1], ["maison", -5, -1],
      ["gare", 7, 7], ["roue", 9, 7], ["parc", 1, 7], ["maison", 2, 7], ["maison", 3, 7], ["villa", 4, 7],
      ["immeuble", 2, -1], ["tour", 3, -1], ["boutique", 4, -1], ["maison", 7, -1], ["immeuble", 8, -1], ["hotel", 9, -1],
    ];
    for (const [cle, dx, dy] of bats) poser(cle, c + dx, c + dy, true);

    // front de mer : on remonte depuis la mer jusqu'a la premiere case de plage libre
    let n = 0;
    for (let x = 4; x < N && n < 9; x++) {
      for (let y = N - 1; y >= 0; y--) {
        if (typeSol(x, y) === 1 && !G(x, y) && (x + y) % 3 === 0) {
          poser(n % 3 === 0 ? "plage_b" : n % 3 === 1 ? "parasol" : "port", x, y, true);
          n++; break;
        }
      }
    }
    etat.argent = 52000;
    recalculer();
    construireDock();
  }

  /* ------------------------------ demarrage ------------------------------ */
  statsAccueil();
  requestAnimationFrame(boucle);
  if (AUTO) {
    setTimeout(() => {
      $("#btn-jouer").click();
      setTimeout(pilote, 400);
    }, 300);
  }
})();
