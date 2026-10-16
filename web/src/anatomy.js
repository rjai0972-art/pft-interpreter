/* PFT Interpreter — Learn: anatomy and bronchoscopy.
   Topics use the same block types as education.js plus { widget: 'tree' | 'stations' | 'vq' | 'lido' | 'lobes' | 'zones' }.
   TREE, STATIONS and SEGMENTS are the data behind the interactive pictures in ui_4b_anatomy.js.
   Scope-view convention: anterior (cartilage rings) at 12 o'clock, posterior membrane at 6; the patient's right on the
   right of the picture, as in the ATS boot-camp and Olympus atlases (the bronchoscopist facing the patient). From the
   head of the bed the picture is mirrored left–right; the viewer has a switch for that. */
(function (root) {
'use strict';

/* ------------------------------------------------------------------ the bronchial tree
   pos: hour on the scope-view clock (12 = anterior, 3 = patient's right, 6 = posterior, 9 = patient's left) and radius
   (0 = centre of the lumen). xy: the node's orifice on the anterior-view map (patient's right on the viewer's left). */
const TREE = {
  larynx: { name: 'Larynx', lobe: '', kids: ['trachea'], xy: [200, 14], big: true,
    see: 'From the oropharynx: the epiglottis, the vallecula in front of it, the aryepiglottic folds running back to the arytenoids (cuneiform and corniculate tubercles), the piriform sinuses on either side, the false (ventricular) folds and, below them, the true vocal cords meeting at the anterior commissure. The glottis is a triangular slit that widens with inspiration.',
    land: 'Look at the cords before passing them: symmetric abduction on a sniff, no lesions. A paralysed left cord in a patient with a lung mass means recurrent laryngeal nerve invasion (aortopulmonary window or arch). Pass during inspiration, along the posterior commissure, after lidocaine has been sprayed onto the cords.',
    tip: 'The subglottis (the first 2 cm below the cords, inside the cricoid ring) is the narrowest fixed point of the adult airway — the site of post-intubation stenosis.' },
  trachea: { name: 'Trachea', lobe: '', kids: ['rmb', 'lmb'], xy: [200, 100], line: [[200, 28], [200, 172]], big: true,
    see: '10–12 cm from the cricoid to the carina (shorter in women), about 2 cm wide. C-shaped cartilage rings (16–20) in front and at the sides; the flat posterior membranous wall (trachealis) carries longitudinal elastic folds. Those folds are the compass: posterior membrane at 6 o’clock, rings at 12.',
    land: 'Proximal (subglottic), mid and distal trachea. The carina is a sharp sagittal keel at the level of the sternal angle (T4–T5). A widened, blunted or immobile carina suggests subcarinal adenopathy (station 7) or tumour.',
    tip: 'The right main bronchus is wider and nearly vertical; the left is longer and leaves at a flatter angle under the aortic arch. The trachea normally deviates a little to the right at the arch. Expiratory collapse of the posterior membrane beyond 50–70% is tracheomalacia.',
    ebus: '2R and 2L from the upper trachea (above the azygos crossing on the right, above the aortic arch on the left); 4R from the anterior-right wall of the distal trachea just above the carina (SVC lateral, azygos vein caudal); 4L from the left lateral wall above the carina (aortic arch above, left pulmonary artery beyond — Doppler before every pass).',
    kidPos: { rmb: [3, 0.42], lmb: [9, 0.42] }, kidSize: { rmb: 0.3, lmb: 0.26 } },
  rmb: { name: 'Right main bronchus', side: 'R', lobe: '', kids: ['rul', 'bi'], xy: [158, 196], big: true,
    see: 'Short (1.5–2.5 cm), wide and nearly vertical (about 25° from the tracheal axis) — the reason aspirated material and a deep endotracheal tube go right. About 2 cm below the carina the right upper lobe bronchus leaves the lateral wall; the airway beyond that takeoff is the bronchus intermedius.',
    land: 'Lateral wall: the RUL orifice, a round opening at 3 o’clock. Straight ahead: the bronchus intermedius. The azygos vein arches over the bronchus from behind to join the SVC just above the RUL takeoff.',
    tip: 'A tracheal bronchus (pre-eparterial RUL or apical segment arising from the trachea above the carina, 0.1–2% of people) is the thing to look for when the RUL “is not there”. A pig bronchus can trap an endotracheal tube cuff and cause RUL collapse.',
    ebus: '10R on the lateral/anterior wall distal to the azygos vein; 7 from the medial wall at the level of the RUL takeoff (no vessel between the wall and the node); 11Rs from the bronchus intermedius just beyond the RUL orifice.',
    kidPos: { rul: [3, 0.6], bi: [8, 0.15] }, kidSize: { rul: 0.22, bi: 0.3 } },
  rul: { name: 'Right upper lobe bronchus', side: 'R', lobe: 'RUL', kids: ['rb1', 'rb2', 'rb3'], xy: [118, 170], big: true,
    see: 'The only lobar bronchus that arises directly from a main bronchus. It runs laterally and divides almost at once into apical (B1), posterior (B2) and anterior (B3) segmental bronchi — three openings in a triangle, the “Mercedes-Benz” sign.',
    land: 'Apical B1 points up toward the apex, posterior B2 backward toward the scapula, anterior B3 forward toward the clavicle. Aspiration while supine goes to B2 (and to B6 below).',
    tip: 'The hardest lobe to enter and to wedge: turn the scope on its axis to bring the orifice into view rather than forcing more flexion. In a ventilated patient a tube sitting on the carina can occlude this orifice.',
    ebus: '11Rs lies between this bronchus and the bronchus intermedius.',
    kidPos: { rb1: [12, 0.5], rb2: [4, 0.5], rb3: [8, 0.5] }, free: true },
  rb1: { name: 'Apical segment (RB1)', side: 'R', lobe: 'RUL', b: 'B1', kids: [], xy: [106, 118], see: 'Points straight up to the apex. Cavitary disease here (post-primary tuberculosis, which favours apical and posterior upper lobe segments) shows at the top of the film above the clavicle.', tip: 'Apical segment biopsies and brushings require the sharpest flexion of the whole tree; the scope often cannot be wedged.' },
  rb2: { name: 'Posterior segment (RB2)', side: 'R', lobe: 'RUL', b: 'B2', kids: [], xy: [80, 150], see: 'Runs back and up. With B6 it is the segment that fills when a supine patient aspirates. Post-primary tuberculosis favours B1 and B2.', tip: 'On a lateral film a B2 process projects over the posterior upper chest.' },
  rb3: { name: 'Anterior segment (RB3)', side: 'R', lobe: 'RUL', b: 'B3', kids: [], xy: [94, 190], see: 'Runs forward and slightly down, against the anterior chest wall. A B3 pneumonia lies next to the upper right heart border without silhouetting it (the border belongs to the middle lobe).', tip: 'Peripheral B3 lesions are reached by navigation or a radial probe; conventional transbronchial biopsy is rarely wedged here.' },
  bi: { name: 'Bronchus intermedius', side: 'R', lobe: '', kids: ['rml', 'rll'], xy: [150, 240], big: true,
    see: '2–3 cm of airway between the RUL takeoff and the middle and lower lobe origins. At its end the middle lobe bronchus leaves anteriorly (slightly laterally) and the lower lobe continues posteriorly; the superior segment of the lower lobe (B6) opens from the posterior wall at about the same level, almost opposite the middle lobe orifice.',
    land: 'Anterior at 12 o’clock: the oval, slit-like middle lobe orifice. Posterior: the lower lobe, with B6 opening backward just inside it.',
    tip: 'The commonest confusion on the right: the RML is anterior, narrow and divides into two; the RLL is posterior, wide and divides into five. Count the openings.',
    ebus: '11Ri from the carina between the middle and lower lobe bronchi; 7 from the medial wall of the proximal bronchus intermedius; 11Rs just distal to the RUL takeoff.',
    kidPos: { rml: [12, 0.48], rll: [6, 0.3] }, kidSize: { rml: 0.2, rll: 0.3 } },
  rml: { name: 'Right middle lobe bronchus', side: 'R', lobe: 'RML', kids: ['rb4', 'rb5'], xy: [124, 270], big: true,
    see: 'Anterior, long and narrow, dividing into lateral (B4) and medial (B5) segments side by side. Its orifice is the usual BAL site in diffuse disease (with the lingula): an anterior, dependent lobe in a supine patient returns more fluid by gravity.',
    land: 'Two openings: lateral B4 toward the chest wall, medial B5 toward the heart. The middle lobe makes the lower right heart border — a middle lobe process silhouettes it.',
    tip: 'A narrow orifice that is easily compressed by hilar nodes: recurrent middle lobe collapse or infection is the middle lobe syndrome. Wedge gently for BAL; over-wedging collapses the walls and reduces return.',
    kidPos: { rb4: [3, 0.45], rb5: [9, 0.45] }, free: true },
  rb4: { name: 'Lateral segment (RB4)', side: 'R', lobe: 'RML', b: 'B4', kids: [], xy: [94, 292], see: 'The lateral half of the middle lobe, against the anterolateral chest wall.', tip: 'A common lavage target when the middle lobe is chosen for BAL.' },
  rb5: { name: 'Medial segment (RB5)', side: 'R', lobe: 'RML', b: 'B5', kids: [], xy: [118, 308], see: 'The medial half of the middle lobe, next to the right heart border — the segment that silhouettes it.', tip: 'Lies against the pericardium; a medial segment biopsy is close to the heart on fluoroscopy.' },
  rll: { name: 'Right lower lobe bronchus', side: 'R', lobe: 'RLL', kids: ['rb6', 'rb7', 'rb8', 'rb9', 'rb10'], xy: [152, 282], big: true,
    see: 'The superior segment (B6) leaves the posterior wall first, then the basal trunk divides into medial (B7), anterior (B8), lateral (B9) and posterior (B10) basal segments. B7 is small and medial; B10 is the most dependent segment in a supine patient.',
    land: 'Posterior at 6 o’clock, right at the entrance: B6. Then four basal openings arranged around the lumen: medial B7 toward the heart, anterior B8, lateral B9, posterior B10.',
    tip: 'Transbronchial biopsies are usually taken from the basal segments of a lower lobe under fluoroscopy: advance the forceps until resistance, pull back 1–2 cm, open on inspiration, close on expiration — and stop if the patient reports pleuritic pain (BTS 2013).',
    ebus: '11Ri sits between the middle and lower lobe bronchi, on the lateral wall of the lower lobe entrance.',
    kidPos: { rb6: [6, 0.62], rb7: [9, 0.4], rb8: [12, 0.42], rb9: [3, 0.42], rb10: [5, 0.3] }, free: true },
  rb6: { name: 'Superior segment (RB6)', side: 'R', lobe: 'RLL', b: 'B6', kids: [], xy: [176, 262], see: 'Leaves the posterior wall of the lower lobe bronchus opposite the middle lobe orifice and runs backward, reaching up behind the upper lobe. The classic aspiration segment in a supine patient, with RB2.', tip: 'Its orifice is often mistaken for the lower lobe itself from the bronchus intermedius — it is the single posterior opening, not the trunk.' },
  rb7: { name: 'Medial basal segment (RB7)', side: 'R', lobe: 'RLL', b: 'B7', kids: [], xy: [172, 330], see: 'The smallest basal segment, medial against the heart and the lower mediastinum (paraesophageal, station 8 territory). Often arises as the first basal branch.', tip: 'Absent as a separate segment on the left (fused with B8).' },
  rb8: { name: 'Anterior basal segment (RB8)', side: 'R', lobe: 'RLL', b: 'B8', kids: [], xy: [126, 342], see: 'Runs forward and down behind the middle lobe, along the anterior costophrenic recess.', tip: 'A common transbronchial biopsy segment under fluoroscopy because it is long and runs away from the heart.' },
  rb9: { name: 'Lateral basal segment (RB9)', side: 'R', lobe: 'RLL', b: 'B9', kids: [], xy: [104, 324], see: 'Runs laterally to the lateral costophrenic angle.', tip: 'With B8 the usual lower-lobe biopsy target; wedge in a subsegment to control bleeding.' },
  rb10: { name: 'Posterior basal segment (RB10)', side: 'R', lobe: 'RLL', b: 'B10', kids: [], xy: [152, 360], see: 'The largest and most dependent basal segment, against the posterior costophrenic angle — the segment that fills with fluid, aspirate and dependent atelectasis.', tip: 'Posterior basal consolidation blurs the posterior diaphragm on the lateral film while the heart border stays sharp.' },
  lmb: { name: 'Left main bronchus', side: 'L', lobe: '', kids: ['lul', 'lll'], xy: [258, 212], big: true,
    see: 'Longer (4–5 cm) and more horizontal (about 45°) than the right, passing under the aortic arch and in front of the oesophagus and descending aorta; a little narrower. It divides at the secondary carina into the upper and lower lobe bronchi — there is no left bronchus intermedius; the lingula is carried by the upper lobe bronchus.',
    land: 'The secondary carina: upper lobe anterolaterally (about 10–11 o’clock), lower lobe continuing posteriorly. Pulsation from the aorta above and the left pulmonary artery in front is normal.',
    tip: 'A pulsatile bulge in the anterior or superior wall is a vessel, not a tumour — never biopsy a pulsatile lesion. The LMB is the usual seat of compression from an enlarged left atrium or aneurysmal aorta.',
    ebus: '4L from the left lateral wall of the distal trachea and proximal LMB (arch above, left PA beyond); 7 from the medial wall; 10L on the lateral wall of the distal LMB with the left pulmonary artery immediately behind it — Doppler first; 11L at the secondary carina.',
    kidPos: { lul: [10.5, 0.46], lll: [5, 0.4] }, kidSize: { lul: 0.24, lll: 0.26 } },
  lul: { name: 'Left upper lobe bronchus', side: 'L', lobe: 'LUL', kids: ['lud', 'ling'], xy: [292, 200], big: true,
    see: 'Short; it divides into the upper (superior) division — apicoposterior (B1+2) and anterior (B3) — and the lingular bronchus (superior B4 and inferior B5). The left lung usually has 8–10 segments because B1 and B2 share a bronchus and B7 is absent or fused with B8.',
    land: 'Two openings one above the other: the upper division superiorly, the lingula inferiorly and a little anteriorly.',
    tip: 'The lingula is the left-sided counterpart of the middle lobe and the second-choice BAL site in diffuse disease (the superior segment of the lingula in the local protocol).',
    ebus: '11L lies between the upper and lower lobe bronchi, sampled from the secondary carina.',
    kidPos: { lud: [12, 0.48], ling: [6, 0.48] }, kidSize: { lud: 0.26, ling: 0.22 } },
  lud: { name: 'Upper division (LUL)', side: 'L', lobe: 'LUL', kids: ['lb12', 'lb3'], xy: [302, 166], big: true,
    see: 'The superior division of the left upper lobe: apicoposterior (B1+2) going up and back, anterior (B3) going forward.',
    land: 'Two openings: B1+2 toward the apex and scapula, B3 toward the clavicle.',
    kidPos: { lb12: [3, 0.46], lb3: [10, 0.46] }, free: true },
  lb12: { name: 'Apicoposterior segment (LB1+2)', side: 'L', lobe: 'LUL', b: 'B1+2', kids: [], xy: [306, 118], see: 'The fused apical and posterior segments of the left upper lobe — the left-sided equivalent of RB1 and RB2 and the favoured site of post-primary tuberculosis on the left.', tip: 'Its orifice often sits so high that only the tip of a well-flexed scope reaches it.' },
  lb3: { name: 'Anterior segment (LB3)', side: 'L', lobe: 'LUL', b: 'B3', kids: [], xy: [334, 164], see: 'Runs forward against the anterior chest wall, above the lingula.', tip: 'Anterior segment disease lies next to the upper left heart border and the aortic knob without silhouetting the heart.' },
  ling: { name: 'Lingular bronchus', side: 'L', lobe: 'LUL (lingula)', kids: ['lb4', 'lb5'], xy: [312, 236], big: true,
    see: 'The lower division of the left upper lobe: superior (B4) and inferior (B5) lingular segments, lying against the left heart border — the lingula silhouettes the left heart border the way the middle lobe silhouettes the right.',
    land: 'Two openings one above the other: superior B4, inferior B5.',
    tip: 'BAL site of choice on the left in diffuse disease; wedge in the superior segment.',
    kidPos: { lb4: [12, 0.45], lb5: [6, 0.45] }, free: true },
  lb4: { name: 'Superior lingular segment (LB4)', side: 'L', lobe: 'LUL (lingula)', b: 'B4', kids: [], xy: [338, 250], see: 'The upper half of the lingula.', tip: 'The local BAL protocol names this segment for diffuse infiltrates when the middle lobe is not used.' },
  lb5: { name: 'Inferior lingular segment (LB5)', side: 'L', lobe: 'LUL (lingula)', b: 'B5', kids: [], xy: [326, 282], see: 'The lower half of the lingula, against the left heart border and the anterior diaphragm.', tip: 'Silhouettes the left heart border when consolidated.' },
  lll: { name: 'Left lower lobe bronchus', side: 'L', lobe: 'LLL', kids: ['lb6', 'lb78', 'lb9', 'lb10'], xy: [280, 262], big: true,
    see: 'The superior segment (B6) leaves the posterior wall at or just below the lower lobe origin; the basal trunk then divides into anteromedial (B7+8), lateral (B9) and posterior (B10) basal segments.',
    land: 'Posterior at 6 o’clock: B6. Then three basal openings: anteromedial B7+8 toward the heart and front, lateral B9, posterior B10.',
    tip: 'The left lower lobe sits behind the heart: on a frontal film its consolidation hides behind the cardiac shadow — look for the lost left hemidiaphragm and the retrocardiac density.',
    ebus: '11L from the secondary carina.',
    kidPos: { lb6: [6, 0.62], lb78: [1, 0.42], lb9: [9, 0.42], lb10: [5, 0.3] }, free: true },
  lb6: { name: 'Superior segment (LB6)', side: 'L', lobe: 'LLL', b: 'B6', kids: [], xy: [256, 246], la: 'end', see: 'The posterior superior segment of the left lower lobe, the left-sided aspiration segment with LB1+2.', tip: 'Opens posteriorly at the lower lobe entrance — the single posterior opening, not the basal trunk.' },
  lb78: { name: 'Anteromedial basal segment (LB7+8)', side: 'L', lobe: 'LLL', b: 'B7+8', kids: [], xy: [304, 322], see: 'The fused medial and anterior basal segments, running forward and medially behind the lingula and the heart.', tip: 'A usual transbronchial biopsy segment on the left (long and away from the heart apex).' },
  lb9: { name: 'Lateral basal segment (LB9)', side: 'L', lobe: 'LLL', b: 'B9', kids: [], xy: [330, 306], see: 'Runs to the lateral costophrenic angle.', tip: 'Biopsy target with B8; wedge in a subsegment.' },
  lb10: { name: 'Posterior basal segment (LB10)', side: 'L', lobe: 'LLL', b: 'B10', kids: [], xy: [288, 348], see: 'The large, dependent posterior basal segment behind the heart, against the posterior costophrenic angle.', tip: 'Dependent atelectasis and aspiration collect here in a supine patient.' }
};
Object.keys(TREE).forEach(k => { TREE[k].id = k; TREE[k].kids.forEach(c => { TREE[c].parent = k; }); });
/* The same tree in three dimensions for the 3D model (millimetres; x toward the patient's left, y anterior, z up; the carina
   at the origin). Each airway runs from its parent's end point `b` (or its own `a`) to its end `b` with radius `r`. The
   lengths, angles and calibres follow the standard adult dimensions (trachea 11 cm × 18 mm; right main 2.5 cm at ~25°, left
   main 5 cm at ~45°; lobar 4–5 mm, segmental 3 mm) — a teaching model, not a patient. */
const TREE3D = {
  larynx: { a: [0, 2, 126], b: [0, 0, 110], r: 7.5, rings: false },
  trachea: { a: [0, 0, 110], b: [0, 0, 0], r: 9, rings: true },
  rmb: { b: [-13, -3, -24], r: 7, rings: true }, rul: { b: [-34, -8, -18], r: 4.5 },
  rb1: { b: [-42, -6, 6], r: 3 }, rb2: { b: [-54, -24, -14], r: 3 }, rb3: { b: [-54, 10, -26], r: 3 },
  bi: { b: [-18, -6, -48], r: 6 }, rml: { b: [-30, 16, -66], r: 4 }, rb4: { b: [-50, 22, -80], r: 2.8 }, rb5: { b: [-28, 30, -86], r: 2.8 },
  rll: { b: [-22, -12, -62], r: 5 }, rb6: { b: [-32, -34, -62], r: 3 }, rb7: { b: [-14, -6, -94], r: 2.5 }, rb8: { b: [-36, 14, -100], r: 3 }, rb9: { b: [-54, -6, -98], r: 3 }, rb10: { b: [-30, -30, -102], r: 3.2 },
  lmb: { b: [34, -6, -30], r: 6.5, rings: true }, lul: { b: [46, 4, -26], r: 4.5 }, lud: { b: [50, 2, -12], r: 3.5 },
  lb12: { b: [54, -12, 12], r: 3 }, lb3: { b: [62, 20, -16], r: 3 }, ling: { b: [54, 16, -46], r: 3.5 }, lb4: { b: [66, 26, -56], r: 2.6 }, lb5: { b: [58, 26, -72], r: 2.6 },
  lll: { b: [42, -14, -56], r: 5 }, lb6: { b: [50, -38, -54], r: 3 }, lb78: { b: [40, 10, -98], r: 3 }, lb9: { b: [66, -6, -96], r: 3 }, lb10: { b: [48, -34, -102], r: 3.2 }
};
Object.keys(TREE3D).forEach(k => { const n = TREE3D[k]; if (!n.a) n.a = TREE3D[TREE[k].parent].b; });

/* ------------------------------------------------------------------ structures around the airway
   What lies against the wall at each level, drawn around the scope view as a schematic ring (an EBUS atlas page without
   the photographs): h = clock position with anterior at 12 and the patient's right at 3, d = distance from the centre as a
   multiple of the lumen radius, s = size as a fraction of the lumen radius. k: a artery · v vein · n node · e oesophagus
   · o other. Positions are the usual ones at the mid-level of that airway, not measurements. */
const LANDMARKS = {
  trachea_upper: [
    { k: 'a', h: 12.3, d: 1.42, s: 0.2, l: 'brachiocephalic a.', t: 'The innominate artery crosses the front of the upper trachea from left to right on its way to the right side of the neck.' },
    { k: 'v', h: 11.0, d: 1.78, s: 0.28, w: 1.9, l: 'L brachiocephalic v.', t: 'The left innominate vein crosses in front of the arch vessels, above the arch; its lower border is the boundary between stations 2 and 4.' },
    { k: 'v', h: 1.6, d: 1.5, s: 0.2, l: 'R brachiocephalic v.', t: 'Joins the left vein to form the SVC to the right of the trachea.' },
    { k: 'a', h: 10.2, d: 1.42, s: 0.13, l: 'L common carotid a.', t: 'Anterolateral left of the upper trachea.' },
    { k: 'a', h: 8.7, d: 1.42, s: 0.13, l: 'L subclavian a.', t: 'Posterolateral left of the upper trachea; the recurrent laryngeal nerve runs up behind it in the tracheo-oesophageal groove.' },
    { k: 'e', h: 6.6, d: 1.35, s: 0.2, l: 'oesophagus', t: 'Behind the posterior membrane, a little to the left.' },
    { k: 'n', h: 1.2, d: 1.17, s: 0.1, l: '2R', t: 'Upper right paratracheal: anterior-right wall of the upper trachea, above the innominate vein (2R extends across to the left tracheal border).' },
    { k: 'n', h: 10.9, d: 1.17, s: 0.1, l: '2L', t: 'Upper left paratracheal: left lateral wall above the aortic arch.' },
    { k: 'n', h: 5.6, d: 1.18, s: 0.1, l: '3p', t: 'Retrotracheal: behind the posterior membrane, in front of the oesophagus.' }
  ],
  trachea: [
    { k: 'v', h: 1.7, d: 1.52, s: 0.22, l: 'SVC', t: 'Superior vena cava: anterolateral right of the lower trachea, lateral to station 4R.' },
    { k: 'v', h: 3.4, d: 1.32, s: 0.13, l: 'azygos arch', t: 'Arches over the right main bronchus from behind to join the SVC; its lower border is the lower border of 4R.' },
    { k: 'a', h: 9.6, d: 1.62, s: 0.3, l: 'aortic arch', t: 'Crosses the left side of the lower trachea and the left main bronchus; above station 4L.' },
    { k: 'a', h: 11.2, d: 1.5, s: 0.22, l: 'ascending aorta', t: 'In front and to the left of the lower trachea.' },
    { k: 'a', h: 12.5, d: 1.28, s: 0.2, l: 'main / right PA', t: 'Below the carina, in front of the main bronchi: fills the picture when the scope is too far down for 4R.' },
    { k: 'a', h: 7.6, d: 1.5, s: 0.24, l: 'descending aorta', t: 'Behind and to the left, beside the oesophagus.' },
    { k: 'e', h: 6.6, d: 1.35, s: 0.2, l: 'oesophagus', t: 'Behind the posterior membrane, a little to the left; 3p lies between.' },
    { k: 'n', h: 2.2, d: 1.18, s: 0.1, l: '4R', t: 'Lower right paratracheal: anterior-right wall just above the carina, SVC lateral, azygos caudal — the workhorse station.' },
    { k: 'n', h: 9.2, d: 1.2, s: 0.1, l: '4L', t: 'Lower left paratracheal: left lateral wall, under the arch, left PA beyond.' },
    { k: 'n', h: 5.6, d: 1.18, s: 0.1, l: '3p', t: 'Retrotracheal: behind the posterior membrane, in front of the oesophagus.' },
    { k: 'n', h: 5.4, d: 1.58, s: 0.1, l: '7', t: 'Subcarinal: below and behind the carina, between the main bronchi — sampled from the medial wall of a main bronchus, not from the trachea.' }
  ],
  rmb: [
    { k: 'v', h: 1.0, d: 1.6, s: 0.22, l: 'SVC', t: 'Anterior and to the right of the proximal right main bronchus.' },
    { k: 'v', h: 2.3, d: 1.32, s: 0.13, l: 'azygos arch', t: 'Crosses over the right main bronchus from behind; 10R lies below it, 4R above.' },
    { k: 'a', h: 11.6, d: 1.3, s: 0.22, l: 'right PA', t: 'Runs in front of the right main bronchus and bronchus intermedius, below the SVC and the azygos.' },
    { k: 'a', h: 10.2, d: 1.6, s: 0.24, l: 'ascending aorta', t: 'Anteromedial, beyond the pulmonary artery.' },
    { k: 'e', h: 7.4, d: 1.35, s: 0.2, l: 'oesophagus', t: 'Posteromedial.' },
    { k: 'n', h: 12.9, d: 1.17, s: 0.1, l: '4R', t: 'Anterior wall at the level of the azygos (its upper border is the lower rim of the azygos).' },
    { k: 'n', h: 2.8, d: 1.17, s: 0.1, l: '10R', t: 'Lateral or anterior wall distal to the azygos vein, before the RUL takeoff.' },
    { k: 'n', h: 9.0, d: 1.17, s: 0.1, l: '7', t: 'Medial wall at the level of the RUL takeoff; no vessel in the way.' },
    { k: 'n', h: 4.4, d: 1.2, s: 0.1, l: '11Rs', t: 'Between the RUL bronchus and the bronchus intermedius, just beyond the RUL orifice.' }
  ],
  rul: [
    { k: 'a', h: 12.0, d: 1.32, s: 0.18, l: 'truncus anterior (A1, A3)', t: 'The first branch of the right PA runs in front of the upper lobe bronchus.' },
    { k: 'v', h: 10.6, d: 1.58, s: 0.2, l: 'R superior pulmonary v.', t: 'Anterior and inferior to the bronchus, in front of the artery.' },
    { k: 'n', h: 3.0, d: 1.17, s: 0.1, l: '12R', t: 'Lobar nodes beside the upper lobe bronchus (12u).' },
    { k: 'n', h: 7.4, d: 1.2, s: 0.1, l: '11Rs', t: 'Between this bronchus and the bronchus intermedius.' }
  ],
  bi: [
    { k: 'a', h: 1.4, d: 1.32, s: 0.22, l: 'interlobar PA', t: 'The right PA continues anterolateral to the bronchus intermedius as the interlobar artery.' },
    { k: 'v', h: 11.6, d: 1.62, s: 0.2, l: 'R superior pulmonary v.', t: 'In front of the artery and the bronchus.' },
    { k: 'v', h: 6.8, d: 1.42, s: 0.2, l: 'R inferior pulmonary v.', t: 'Posteromedial and below, running to the left atrium.' },
    { k: 'e', h: 8.3, d: 1.35, s: 0.2, l: 'oesophagus', t: 'Medial and behind; station 8 lies against it.' },
    { k: 'n', h: 9.3, d: 1.17, s: 0.1, l: '7', t: 'Medial wall of the proximal bronchus intermedius.' },
    { k: 'n', h: 3.2, d: 1.17, s: 0.1, l: '11Rs', t: 'Lateral wall just beyond the RUL orifice.' },
    { k: 'n', h: 12.4, d: 1.17, s: 0.1, l: '11Ri', t: 'At the spur between the middle and lower lobe bronchi.' }
  ],
  rml: [
    { k: 'a', h: 2.2, d: 1.32, s: 0.15, l: 'A4, A5', t: 'The middle lobe arteries run lateral to the middle lobe bronchus.' },
    { k: 'v', h: 10.4, d: 1.35, s: 0.15, l: 'V4, V5', t: 'The middle lobe veins run medial and below, to the superior pulmonary vein.' },
    { k: 'n', h: 3.6, d: 1.17, s: 0.1, l: '12R', t: 'Lobar nodes (12m) beside the middle lobe bronchus.' },
    { k: 'n', h: 6.2, d: 1.2, s: 0.1, l: '11Ri', t: 'Behind, at the spur with the lower lobe bronchus.' }
  ],
  rll: [
    { k: 'a', h: 1.6, d: 1.32, s: 0.2, l: 'basal trunk PA', t: 'The interlobar artery continues as the basal trunk, anterolateral to the lower lobe bronchus.' },
    { k: 'v', h: 7.8, d: 1.45, s: 0.2, l: 'R inferior pulmonary v.', t: 'Posteromedial, in the pulmonary ligament (station 9 along it).' },
    { k: 'e', h: 9.6, d: 1.4, s: 0.2, l: 'oesophagus', t: 'Medial; station 8 lies against it.' },
    { k: 'n', h: 3.0, d: 1.17, s: 0.1, l: '12R', t: 'Lobar nodes (12l) beside the lower lobe bronchus.' },
    { k: 'n', h: 12.0, d: 1.2, s: 0.1, l: '11Ri', t: 'In front, at the spur with the middle lobe bronchus.' },
    { k: 'n', h: 8.6, d: 1.17, s: 0.1, l: '8', t: 'Paraoesophageal: medial, below the bronchus intermedius — an EUS station.' }
  ],
  lmb: [
    { k: 'a', h: 10.4, d: 1.62, s: 0.3, l: 'aortic arch', t: 'Above and lateral to the proximal left main bronchus; 4L lies under it.' },
    { k: 'a', h: 6.8, d: 1.5, s: 0.26, l: 'descending aorta', t: 'Behind and to the left of the distal left main bronchus.' },
    { k: 'a', h: 12.4, d: 1.32, s: 0.24, l: 'left PA', t: 'In front of the left main bronchus, then arching over the upper lobe bronchus — behind 10L.' },
    { k: 'v', h: 1.6, d: 1.65, s: 0.2, l: 'L superior pulmonary v.', t: 'Anterior and below at the hilum, in front of the artery.' },
    { k: 'e', h: 5.2, d: 1.35, s: 0.2, l: 'oesophagus', t: 'Behind the posterior membrane, slightly medial.' },
    { k: 'n', h: 10.0, d: 1.18, s: 0.1, l: '4L', t: 'Left lateral wall of the distal trachea and proximal LMB, under the arch.' },
    { k: 'n', h: 11.4, d: 1.75, s: 0.1, l: '5', t: 'Subaortic (AP window): outside the airway beyond the ligamentum arteriosum — not an EBUS station.' },
    { k: 'n', h: 3.0, d: 1.17, s: 0.1, l: '7', t: 'Medial wall of the left main bronchus.' },
    { k: 'n', h: 9.0, d: 1.17, s: 0.1, l: '10L', t: 'Lateral wall of the distal LMB, the left PA immediately behind it.' },
    { k: 'n', h: 7.4, d: 1.17, s: 0.1, l: '11L', t: 'At the secondary carina between the upper and lower lobe bronchi.' }
  ],
  lul: [
    { k: 'a', h: 9.4, d: 1.32, s: 0.24, l: 'left PA', t: 'Arches over the upper lobe bronchus and descends behind and lateral to it.' },
    { k: 'a', h: 1.2, d: 1.3, s: 0.14, l: 'lingular a. (A4+5)', t: 'Anterolateral, to the lingula.' },
    { k: 'v', h: 12.0, d: 1.6, s: 0.2, l: 'L superior pulmonary v.', t: 'In front of the upper lobe bronchus.' },
    { k: 'n', h: 6.0, d: 1.17, s: 0.1, l: '11L', t: 'Between the upper and lower lobe bronchi.' },
    { k: 'n', h: 3.0, d: 1.17, s: 0.1, l: '12L', t: 'Lobar nodes (12u) beside the upper lobe bronchus.' },
    { k: 'n', h: 8.0, d: 1.2, s: 0.1, l: '10L', t: 'Just proximal, on the distal left main bronchus.' }
  ],
  lll: [
    { k: 'a', h: 9.6, d: 1.32, s: 0.2, l: 'basal trunk PA', t: 'The left PA descends posterolateral to the lower lobe bronchus and continues as the basal trunk.' },
    { k: 'a', h: 6.4, d: 1.55, s: 0.26, l: 'descending aorta', t: 'Behind and medial.' },
    { k: 'v', h: 5.0, d: 1.45, s: 0.2, l: 'L inferior pulmonary v.', t: 'Inferomedial, in the pulmonary ligament.' },
    { k: 'e', h: 3.8, d: 1.35, s: 0.2, l: 'oesophagus', t: 'Medial; station 8 lies against it.' },
    { k: 'n', h: 12.0, d: 1.2, s: 0.1, l: '11L', t: 'In front, at the secondary carina.' },
    { k: 'n', h: 9.0, d: 1.17, s: 0.1, l: '12L', t: 'Lobar nodes (12l) beside the lower lobe bronchus.' },
    { k: 'n', h: 3.0, d: 1.17, s: 0.1, l: '8', t: 'Paraoesophageal: medial, below the upper lobe bronchus — an EUS station.' }
  ]
};
LANDMARKS.lud = LANDMARKS.lul.filter(x => /PA|pulmonary v|12L/.test(x.l));
LANDMARKS.ling = [{ k: 'a', h: 2.0, d: 1.3, s: 0.14, l: 'lingular a. (A4+5)', t: 'Lateral to the lingular bronchus.' }, { k: 'v', h: 10.0, d: 1.35, s: 0.14, l: 'lingular v. (V4+5)', t: 'Medial and below, to the superior pulmonary vein.' }, { k: 'n', h: 6.0, d: 1.2, s: 0.1, l: '12L', t: 'Lobar nodes beside the lingular bronchus.' }];

/* schematic EBUS picture per station: where the probe sits and which structures surround the node on the screen
   (positions on the picture: L/R beside the node, D deep to it, DL/DR deep and to one side, SL/SR shallow and to one side) */
const SONO = {
  '2R': { probe: 'anterior-right wall of the upper trachea, tip flexed up', near: [['brachiocephalic a.', 'a', 'DL'], ['R brachiocephalic v. → SVC', 'v', 'DR']], note: 'The artery pulsates and shows arterial flow on Doppler; the vein is compressible and fills with colour on a sniff.' },
  '2L': { probe: 'left lateral wall of the upper trachea, above the arch', near: [['L common carotid a.', 'a', 'DL'], ['L subclavian a.', 'a', 'DR']], note: 'Advance a little and the aortic arch fills the deep field.' },
  '3p': { probe: 'posterior membrane of the trachea (an awkward angle)', near: [['oesophagus', 'e', 'D'], ['vertebral body (acoustic shadow)', 'o', 'DR']], note: 'Easier from the oesophagus (EUS-B).' },
  '4R': { probe: 'anterior-right wall of the distal trachea, just above the carina', near: [['SVC', 'v', 'R'], ['azygos v.', 'v', 'DR'], ['ascending aorta', 'a', 'DL']], note: 'The right PA fills the deep field when the scope is too far down. Pretracheal nodes left of the midline are still 4R.' },
  '4L': { probe: 'left lateral wall of the distal trachea / proximal left main bronchus', near: [['aortic arch', 'a', 'SL'], ['left PA', 'a', 'DR']], note: 'A 4L node and the left PA look alike in grey scale: colour Doppler before every pass.' },
  '7': { probe: 'medial wall of the right main bronchus at the RUL level (or of the left main bronchus)', near: [['right PA', 'a', 'L'], ['left atrium', 'v', 'D'], ['oesophagus', 'e', 'DR']], note: 'No vessel between the wall and the node; the pulsating chamber deep to it is the left atrium.' },
  '10R': { probe: 'lateral or anterior wall of the right main bronchus distal to the azygos', near: [['azygos v.', 'v', 'SR'], ['SVC', 'v', 'L'], ['right PA', 'a', 'DL']], note: 'The azygos arch is the upper border of 10R; above it the same node would be 4R.' },
  '10L': { probe: 'lateral wall of the distal left main bronchus', near: [['left PA', 'a', 'D'], ['descending aorta', 'a', 'DR']], note: 'The left PA lies immediately behind the node — Doppler first.' },
  '11R': { probe: '11Rs: lateral wall of the bronchus intermedius beyond the RUL; 11Ri: the spur between the middle and lower lobe bronchi', near: [['interlobar PA', 'a', 'R'], ['R superior pulmonary v.', 'v', 'DL']], note: 'Hilar nodes are small and sit between branching vessels; identify the artery before the needle.' },
  '11L': { probe: 'the secondary carina, against the upper or lower lobe bronchus', near: [['left PA', 'a', 'DR'], ['L superior pulmonary v.', 'v', 'L']], note: '' },
  '12–14': { probe: 'inside the lobar bronchus (12u, 12m, 12l)', near: [['lobar artery', 'a', 'R'], ['lobar vein', 'v', 'DL']], note: 'Only station 12 is reached with the convex probe; 13 and 14 need the radial probe or surgery.' }
};
const SEGMENTS = [
  ['Right upper', 'B1 apical · B2 posterior · B3 anterior', '3'],
  ['Right middle', 'B4 lateral · B5 medial', '2'],
  ['Right lower', 'B6 superior · B7 medial basal · B8 anterior basal · B9 lateral basal · B10 posterior basal', '5'],
  ['Left upper (upper division)', 'B1+2 apicoposterior · B3 anterior', '2'],
  ['Left upper (lingula)', 'B4 superior · B5 inferior', '2'],
  ['Left lower', 'B6 superior · B7+8 anteromedial basal · B9 lateral basal · B10 posterior basal', '4']
];

/* ------------------------------------------------------------------ IASLC nodal stations (2009 map)
   xy: position on the mediastinal map (anterior view, patient's right on the viewer's left). n: N category for a tumour on the
   same side. reach: how the station is sampled. where: the bronchoscopic position for EBUS-TBNA. */
const STATIONS = [
  { id: '1', name: 'Low cervical, supraclavicular and sternal notch', zone: 'Supraclavicular', n: 'N3 (any side)', xy: [[168, 42], [252, 42]],
    upper: 'Lower margin of the cricoid cartilage', lower: 'The clavicles on each side and, in the midline, the upper border of the manubrium; 1R and 1L are separated by the midline of the trachea',
    reach: { ebus: false, eus: false, med: false, other: 'Neck ultrasound-guided FNA or core biopsy; an involved supraclavicular node is the easiest N3 to prove' },
    where: 'Not reached from the airway.' },
  { id: '2R', name: 'Upper paratracheal (right)', zone: 'Upper (superior mediastinal)', n: 'N2 right · N3 left', xy: [[186, 92]],
    upper: 'Apex of the right lung and pleural space and, in the midline, the upper border of the manubrium', lower: 'Intersection of the caudal margin of the innominate (left brachiocephalic) vein with the trachea. 2R extends to the left lateral border of the trachea (the oncologic midline)',
    reach: { ebus: true, eus: false, med: true, other: '' },
    where: 'Scope high in the trachea, transducer against the anterior-right wall, tip flexed up: the right brachiocephalic artery and the brachiocephalic veins are the landmarks. The hardest EBUS station under moderate sedation because the scope sits just below the cords.' },
  { id: '2L', name: 'Upper paratracheal (left)', zone: 'Upper (superior mediastinal)', n: 'N2 left · N3 right', xy: [[236, 96]],
    upper: 'Apex of the lung and pleural space and the upper border of the manubrium', lower: 'Superior border of the aortic arch',
    reach: { ebus: true, eus: true, med: true, other: '' },
    where: 'Left lateral wall of the upper trachea above the arch; the left common carotid artery and the arch itself are the landmarks.' },
  { id: '3a', name: 'Prevascular', zone: 'Upper (superior mediastinal)', n: 'N2 (ipsilateral)', xy: [[118, 118]],
    upper: 'Apex of the chest', lower: 'Level of the carina; anterior border the back of the sternum, posterior border the front of the SVC (right) or the left carotid artery (left)',
    reach: { ebus: false, eus: false, med: false, other: 'CT-guided needle, anterior mediastinotomy or VATS — the vessels lie between these nodes and the airway' },
    where: 'In front of the great vessels: out of reach of both scopes.' },
  { id: '3p', name: 'Retrotracheal', zone: 'Upper (superior mediastinal)', n: 'N2 (ipsilateral)', xy: [[210, 136]], dashed: true,
    upper: 'Apex of the chest', lower: 'The carina',
    reach: { ebus: true, eus: true, med: false, other: '' },
    where: 'Behind the trachea: EBUS from the posterior membrane (an awkward angle), EUS easily through the oesophageal wall.' },
  { id: '4R', name: 'Lower paratracheal (right)', zone: 'Upper (superior mediastinal)', n: 'N2 right · N3 left', xy: [[184, 162]],
    upper: 'Intersection of the caudal margin of the innominate vein with the trachea', lower: 'Lower border of the azygos vein. Includes right paratracheal and pretracheal nodes as far as the left lateral border of the trachea',
    reach: { ebus: true, eus: false, med: true, other: '' },
    where: 'The workhorse: distal trachea, transducer on the anterior-right wall just above the carina. The SVC lies lateral and the azygos vein caudal; the right pulmonary artery appears when the scope is too far down. Pretracheal nodes to the left of the midline are still 4R.' },
  { id: '4L', name: 'Lower paratracheal (left)', zone: 'Upper (superior mediastinal)', n: 'N2 left · N3 right', xy: [[240, 170]],
    upper: 'Upper margin of the aortic arch', lower: 'Upper rim of the left main pulmonary artery; nodes to the left of the left lateral tracheal border and medial to the ligamentum arteriosum',
    reach: { ebus: true, eus: true, med: true, other: '' },
    where: 'Left lateral wall of the distal trachea and proximal left main bronchus: the arch above, the left pulmonary artery beyond and below — colour Doppler before the needle; a 4L node and the PA look alike in grey scale. Often easier from the oesophagus (EUS).' },
  { id: '5', name: 'Subaortic (aortopulmonary window)', zone: 'Aortopulmonary', n: 'N2 left · N3 right', xy: [[272, 186]],
    upper: 'Lower border of the aortic arch', lower: 'Upper rim of the left main pulmonary artery; lateral to the ligamentum arteriosum',
    reach: { ebus: false, eus: true, med: false, other: 'Anterior mediastinotomy (Chamberlain) or VATS; EUS-FNA reaches it in some patients; transvascular EBUS is an expert-only exception' },
    where: 'Outside the airway with the aorta and pulmonary artery in the way. Suspect it when a left upper lobe tumour comes with a hoarse voice (recurrent laryngeal nerve).' },
  { id: '6', name: 'Para-aortic', zone: 'Aortopulmonary', n: 'N2 left · N3 right', xy: [[300, 148]],
    upper: 'A line tangential to the upper border of the aortic arch', lower: 'Lower border of the arch; nodes anterior and lateral to the ascending aorta and arch (along the phrenic nerve)',
    reach: { ebus: false, eus: false, med: false, other: 'Anterior mediastinotomy (Chamberlain), VATS or CT-guided needle' },
    where: 'Not reached from the airway or the oesophagus.' },
  { id: '7', name: 'Subcarinal', zone: 'Subcarinal', n: 'N2 (either side)', xy: [[210, 226]],
    upper: 'The carina', lower: 'Upper border of the lower lobe bronchus on the left; lower border of the bronchus intermedius on the right',
    reach: { ebus: true, eus: true, med: true, other: 'Mediastinoscopy reaches only its anterior part' },
    where: 'From the medial wall of the right main bronchus at the level of the RUL takeoff, or from the medial wall of the left main bronchus. No vessel lies between the wall and the node; the oesophagus is behind, the left atrium below and the right pulmonary artery in front. The easiest station for EUS.' },
  { id: '8', name: 'Paraoesophageal (below the carina)', zone: 'Lower (inferior mediastinal)', n: 'N2 (ipsilateral)', xy: [[224, 296]],
    upper: 'Upper border of the lower lobe bronchus (left) or lower border of the bronchus intermedius (right)', lower: 'The diaphragm; nodes against the oesophageal wall to either side of the midline, excluding subcarinal nodes',
    reach: { ebus: false, eus: true, med: false, other: '' },
    where: 'Too far from the airway: a classic EUS station (the EBUS scope passed into the oesophagus, EUS-B, reaches it as well).' },
  { id: '9', name: 'Pulmonary ligament', zone: 'Lower (inferior mediastinal)', n: 'N2 (ipsilateral)', xy: [[178, 338], [248, 338]],
    upper: 'The inferior pulmonary vein', lower: 'The diaphragm; nodes lying within the pulmonary ligament',
    reach: { ebus: false, eus: true, med: false, other: 'VATS' },
    where: 'Reached from the oesophagus only.' },
  { id: '10R', name: 'Hilar (right)', zone: 'Hilar', n: 'N1 right · N3 left', xy: [[160, 206]],
    upper: 'Lower rim of the azygos vein', lower: 'The interlobar region; nodes immediately adjacent to the main bronchus and hilar vessels including the proximal pulmonary veins and main pulmonary artery',
    reach: { ebus: true, eus: false, med: false, other: '' },
    where: 'Lateral or anterior wall of the right main bronchus distal to the azygos vein, before the RUL takeoff.' },
  { id: '10L', name: 'Hilar (left)', zone: 'Hilar', n: 'N1 left · N3 right', xy: [[270, 242]],
    upper: 'Upper rim of the left pulmonary artery', lower: 'The interlobar region',
    reach: { ebus: true, eus: false, med: false, other: '' },
    where: 'Lateral wall of the distal left main bronchus; the left pulmonary artery lies immediately behind the node — Doppler before every pass.' },
  { id: '11R', name: 'Interlobar (right): 11s and 11i', zone: 'Hilar', n: 'N1 right · N3 left', xy: [[136, 214], [136, 276]],
    upper: '11s between the upper lobe bronchus and the bronchus intermedius; 11i between the middle and lower lobe bronchi', lower: 'Nodes between the origins of the lobar bronchi',
    reach: { ebus: true, eus: false, med: false, other: '' },
    where: '11Rs from the bronchus intermedius just beyond the RUL orifice (lateral wall); 11Ri from the carina between the middle and lower lobe bronchi.' },
  { id: '11L', name: 'Interlobar (left)', zone: 'Hilar', n: 'N1 left · N3 right', xy: [[292, 258]],
    upper: 'Between the origins of the upper and lower lobe bronchi', lower: '',
    reach: { ebus: true, eus: false, med: false, other: '' },
    where: 'From the secondary carina, against the wall of the lower lobe bronchus or the upper lobe bronchus.' },
  { id: '12–14', name: 'Lobar, segmental and subsegmental', zone: 'Peripheral', n: 'N1', xy: [[112, 302], [310, 294]],
    upper: '12: adjacent to the lobar bronchi · 13: adjacent to the segmental bronchi · 14: adjacent to the subsegmental bronchi', lower: '',
    reach: { ebus: true, eus: false, med: false, other: 'Station 12 with the convex probe from a lobar bronchus; 13–14 only with the radial probe or at surgery' },
    where: 'Station 12 from inside the lobar bronchus (12u upper, 12m middle, 12l lower).' }
];

/* ------------------------------------------------------------------ topics */
const T = {};

T.airway = { title: 'Lungs, lobes and segments', kicker: 'The map the scope follows', blocks: [
  { p: 'Everything in the chest is organised around the bronchial tree. Each lobe has its own bronchus, artery branch and pleural envelope; each bronchopulmonary segment is a wedge of lung with its own segmental bronchus and artery, separated from its neighbours by septa carrying the veins. The segment is the unit of bronchoscopic sampling and of anatomic resection, so its names and numbers are worth knowing cold.' },
  { widget: 'lobes' },
  { h: 'Lobes and fissures', ul: [
    'Right lung: three lobes. The oblique (major) fissure separates the lower lobe from the upper and middle lobes; the horizontal (minor) fissure separates the upper from the middle lobe at the level of the fourth rib anteriorly. The horizontal fissure is often incomplete and sometimes absent.',
    'Left lung: two lobes separated by the oblique fissure. The lingula is the part of the upper lobe that corresponds to the middle lobe. Accessory fissures (azygos lobe, superior accessory, inferior accessory) are common normal variants.',
    'The oblique fissures run from about T4 posteriorly to the sixth costochondral junction anteriorly — on a lateral film they slope forward and down. Much of the lower lobe is therefore posterior and much of the upper lobe anterior, which is why upper-lobe disease is best seen on the PA film and lower-lobe disease is heard best at the back.'] },
  { h: 'Segments', table: { head: ['Lobe', 'Segments (Boyden numbering)', 'Count'], rows: SEGMENTS }, note: 'The right lung has ten segments. The left usually has eight: B1 and B2 share a bronchus (apicoposterior), and B7 is absent or fused with B8 (anteromedial basal). Segmental anatomy varies; the numbers stay the same from person to person even when the branching pattern does not.' },
  { h: 'Silhouettes on the radiograph', ul: [
    'Right middle lobe (B4, B5) and lingula (B4, B5) lie against the heart: consolidation there erases the right or left heart border.',
    'Lower lobes lie against the diaphragm: lower-lobe consolidation erases the hemidiaphragm while the heart border stays sharp; the left lower lobe hides behind the heart on the frontal film.',
    'Anterior segments of the upper lobes (B3) lie beside the upper mediastinum without silhouetting the heart; apical and posterior segments (B1, B2, B1+2) sit above the clavicle and behind the hilum — the territory of post-primary tuberculosis and of aspiration in a supine patient (with B6).'] },
  { h: 'Vessels and nerves the bronchoscopist meets', ul: [
    'Pulmonary arteries travel with the bronchi (the right PA crosses in front of the bronchus intermedius; the left PA hooks over the left main bronchus) — the reason 10L and 4L need Doppler before a needle.',
    'Pulmonary veins run between segments and drain to the left atrium below the carina (behind station 7).',
    'Bronchial arteries arise from the descending aorta (and the right third intercostal artery) and supply the airway walls: they, not the pulmonary arteries, are the source of 90% of massive haemoptysis and the target of bronchial artery embolisation.',
    'The left recurrent laryngeal nerve loops under the aortic arch beside the ligamentum arteriosum (station 5): a left vocal cord palsy with a lung mass is a staging finding.',
    'The azygos vein arches over the right main bronchus to the SVC (the boundary between 4R and 10R); the aortic arch over the left main bronchus (the boundary between 2L and 4L).'] },
  { src: ['Bronchoscopy 101 — ATS Resident Boot Camp 2019 (Diaz-Mendoza J, Makani S): airway views and segment maps.', 'Oho K, Matsukawa K. The bronchus through the bronchovideoscope (Olympus teaching chart): segmental nomenclature.', 'Boyden EA. Segmental anatomy of the lungs. McGraw-Hill 1955 (numbering).'] }
] };

T.tree = { title: 'Bronchial tree navigator', kicker: 'Walk the airway, name what you see', blocks: [
  { p: 'Start at the larynx and advance into any opening; the map on the left shows where you are, the circle on the right shows what the scope sees from there, and the notes name the landmarks, the pitfalls and the EBUS stations that sit against that wall. With the landmarks switched on, the ring around the scope view shows what lies against the wall at that level — arteries, veins, the oesophagus and the nodal stations in their usual clock positions, the way an EBUS atlas lays them out. Use the drill to practise finding a segment from the carina without looking.' },
  { widget: 'tree' },
  { h: 'The same tree in three dimensions', p: 'Orbit the whole tree, or stand inside the airway you have selected above and look at the openings ahead the way the scope does; the two views and the navigator share one position.' },
  { widget: 'tree3d' },
  { h: 'Orientation rules', ul: [
    'Find the posterior membrane. Cartilage rings are in front and at the sides; the flat wall with longitudinal folds is behind. Keep it at 6 o’clock and the picture is oriented.',
    'The picture here puts the patient’s right on the right, as when the bronchoscopist faces the patient (the ATS and Olympus atlases). From the head of the bed the image is a mirror image — flip the switch to practise that way.',
    'Right side: main bronchus → upper lobe laterally at 2 cm → bronchus intermedius → middle lobe in front, lower lobe behind, B6 opening backward just inside the lower lobe. Left side: long main bronchus → secondary carina → upper lobe (upper division plus lingula) in front and above, lower lobe behind.',
    'Count the openings. Two in front on the right means middle lobe (B4, B5); four or five behind means lower lobe. A single posterior opening at the lower lobe entrance is B6, not the basal trunk.',
    'Turn the scope on its axis to bring an orifice into the centre of the picture before flexing into it; forcing flexion against the wall is what damages scopes and mucosa.'] },
  { h: 'More to explore (open on their own sites)', p: 'Segmented models from real CT scans and a virtual bronchoscopy simulator; each belongs to its author and opens in a new tab.', links: [
    ['Virtual Bronchoscopy simulation — University of Toronto, Perioperative Interactive Education', 'https://pie.med.utoronto.ca/VB/VB_content/simulation.html', 'drive a scope through a CT-derived airway'],
    ['Tracheobronchial tree (Sketchfab)', 'https://sketchfab.com/3d-models/tracheobronchial-tree-d3cbd7d5adb74ba7b54c1df151900b96', 'segmented airway model'],
    ['3D bronchus model (Sketchfab)', 'https://sketchfab.com/3d-models/3d-bronchus-model-c1f1686b95d4494f8d68f3c87188089f', ''],
    ['Lungs and bronchial tree (Sketchfab)', 'https://sketchfab.com/3d-models/lungs-bronchial-tree-3ef7f35a436849dc8a5ee6a3d2a393a9', 'airways inside the lungs'],
    ['Airway model (Sketchfab viewer)', 'https://sketchfab.com/models/ec147b3fe06a41689711710024c1342a/embed', '']] }
] };

T.stations = { title: 'Mediastinal nodal stations', kicker: 'IASLC map · EBUS and EUS reach · N staging', blocks: [
  { p: 'The IASLC lymph node map (2009) fixes each station by anatomic borders so that CT, EBUS and surgery describe the same node. Tap a station for its borders, its N category, which scope reaches it, where to put the transducer and a schematic of the EBUS picture — the node and the vessels that sit around it on the screen.' },
  { widget: 'stations' },
  { h: 'N staging in one minute', ul: [
    'N1: stations 10–14 on the side of the tumour (hilar, interlobar, lobar, segmental, subsegmental) — inside the pleural reflection.',
    'N2: ipsilateral mediastinal stations 2–9 and the subcarinal station 7 (which counts as ipsilateral for either side). The 9th edition of TNM (2024) splits N2 into N2a (a single station) and N2b (more than one station).',
    'N3: any contralateral mediastinal or hilar station, and any scalene or supraclavicular node (station 1). The oncologic midline for 2 and 4 is the left lateral border of the trachea, so a pretracheal node lying to the left of the midline is still 4R.',
    'Zones: supraclavicular (1); upper (2R, 2L, 3a, 3p, 4R, 4L); aortopulmonary (5, 6); subcarinal (7); lower (8, 9); hilar/interlobar (10, 11); peripheral (12–14).'] },
  { h: 'Who reaches what', table: { head: ['Station', 'EBUS-TBNA', 'EUS(-B)-FNA', 'Mediastinoscopy', 'Other'], rows: [
    ['1', '—', '—', '—', 'Neck ultrasound FNA'],
    ['2R, 2L', 'Yes', '2L sometimes', 'Yes', ''],
    ['3a', '—', '—', '—', 'CT-guided, VATS, anterior mediastinotomy'],
    ['3p', 'Sometimes', 'Yes', '—', ''],
    ['4R, 4L', 'Yes', '4L often', 'Yes', ''],
    ['5, 6', '—', '5 sometimes', '—', 'Chamberlain, VATS'],
    ['7', 'Yes', 'Yes', 'Anterior part', ''],
    ['8, 9', '—', 'Yes', '—', 'VATS'],
    ['10, 11', 'Yes', '—', '—', ''],
    ['12', 'From a lobar bronchus', '—', '—', '13–14: radial probe or surgery']] },
    note: 'EBUS plus EUS (the same EBUS scope passed into the oesophagus, EUS-B) gives near-complete access to the mediastinum; the stations neither scope reaches (3a, 5, 6) need an anterior approach. A negative needle staging with a high pretest probability (PET-avid N2, central tumour, N1 disease on CT) is confirmed surgically before resection.' },
  { h: 'Systematic staging with EBUS', ol: [
    'Image every reachable station and measure the short axis; sample every node of 5 mm or more at 4R, 4L and 7 at least, plus any node that is PET-avid, enlarged (≥1 cm) or sonographically suspicious.',
    'Sample in order N3 → N2 → N1 (contralateral mediastinum first, ipsilateral hilum last) so that the needle never carries tumour cells from a lower to a higher stage.',
    'Colour Doppler before every pass; the pulmonary artery sits behind 10L, 4L and 11, the SVC beside 4R, the azygos below it.',
    'Three passes per node without rapid on-site evaluation (more for molecular studies); 22-gauge is standard, 21 or 19 gauge for more tissue.',
    'Sonographic features that favour malignancy (Fujiwara 2010): round shape, distinct margin, heterogeneous echotexture, absent central hilar structure and the coagulation-necrosis sign; firm (blue) on elastography.',
    'Report every station seen, sampled and its result; a station seen but not sampled is still a staging statement.'] },
  { src: ['Rusch VW, et al. The IASLC lung cancer staging project: a proposal for a new international lymph node map. J Thorac Oncol 2009;4:568–77.', 'Regional nodal stations for lung cancer staging (Mountain/Dresler modifications of the Naruke/ATS-LCSG map, 1997) — the wall chart, superseded by the IASLC map.', 'Regional lymph node mapping with EBUS-TBNA (Olympus teaching chart).', 'Silvestri GA, et al. Methods for staging non-small cell lung cancer: ACCP guideline, 3rd ed. Chest 2013;143(5 Suppl):e211S–e250S.', 'Fujiwara T, et al. The utility of sonographic features during EBUS-TBNA for lymph node staging. Chest 2010;138:641–7.'] }
] };

T.vq = { title: 'Ventilation and perfusion', kicker: 'V/Q · shunt · dead space · the oxygen–carbon dioxide diagram', blocks: [
  { p: 'Gas exchange happens where ventilation (V̇A, about 4 L/min at rest) meets perfusion (Q̇, about 5 L/min): a whole-lung ratio near 0.8. The ratio in any one unit sets that unit’s alveolar gas. Drag the slider to see what one alveolus does as its ratio moves from shunt to dead space, then switch to 100% oxygen to see why oxygen rescues a low-V/Q unit but not a shunt.' },
  { widget: 'vq' },
  { h: 'The two ends of the line', ul: [
    'V/Q = 0 (shunt): blood passes an unventilated unit and leaves with mixed-venous gas (PO2 ≈ 40, PCO2 ≈ 46 mm Hg). Giving oxygen cannot reach that blood, so the hypoxaemia of a true shunt barely responds to 100% O2. Causes: atelectasis, consolidation, pulmonary oedema, intracardiac right-to-left shunt, pulmonary AVMs, hepatopulmonary syndrome.',
    'V/Q = ∞ (dead space): ventilation without perfusion; alveolar gas stays at inspired composition (PO2 150, PCO2 0) and the ventilation is wasted. Anatomic dead space is the conducting airway (≈2 mL/kg); alveolar dead space grows with pulmonary embolism, low cardiac output, overdistension and pulmonary vascular disease.',
    'Between the ends every unit sits on the V/Q line: a low ratio drops PO2 steeply while PCO2 rises only a little (the CO2 curve is nearly linear, the O2 curve is flat at the top), so V/Q scatter mainly causes hypoxaemia, and hypercapnia appears only when total ventilation can no longer compensate.'] },
  { h: 'West’s zones and the upright lung', ul: [
    'Both ventilation and blood flow increase from apex to base in the upright lung, but flow increases more: V/Q is about 3 at the apex and about 0.6 at the base. Apical alveoli run a high PO2 (≈130) and low PCO2 (≈28); basal alveoli a lower PO2 (≈90) and higher PCO2 (≈42).',
    'Zone 1 (PA > Pa > Pv): alveolar pressure exceeds arterial pressure, no flow — does not exist in a healthy upright lung but appears with positive-pressure ventilation, haemorrhage or PEEP. Zone 2 (Pa > PA > Pv): flow depends on the arterial–alveolar difference (a waterfall). Zone 3 (Pa > Pv > PA): flow depends on the arterial–venous difference, as everywhere else in the body.',
    'Hypoxic pulmonary vasoconstriction diverts flow away from poorly ventilated units and limits the effect of V/Q mismatch; anaesthetic vapours and vasodilators blunt it and can worsen oxygenation.'] },
  { widget: 'zones' },
  { h: 'The five causes of hypoxaemia', table: { head: ['Mechanism', 'A–a gradient', 'Response to O2', 'Typical setting'], rows: [
    ['Low inspired PO2', 'Normal', 'Corrects', 'Altitude, hypoxic gas mixture'],
    ['Hypoventilation', 'Normal', 'Corrects (CO2 stays high)', 'Opioids, neuromuscular disease, obesity hypoventilation'],
    ['V/Q mismatch', 'Raised', 'Corrects', 'COPD, asthma, interstitial disease, pulmonary embolism'],
    ['Shunt', 'Raised', 'Poor response', 'Atelectasis, pneumonia, oedema, ARDS, AVM, intracardiac shunt'],
    ['Diffusion limitation', 'Raised', 'Corrects', 'Fibrosis, especially on exercise; rarely alone at rest']] },
    note: 'PAO2 = FiO2 × (Patm − 47) − PaCO2/0.8; at sea level on air ≈ 150 − 1.25 × PaCO2. Normal A–a gradient ≈ 2.5 + 0.21 × age (or roughly age/4 + 4) mm Hg. Shunt fraction Q̇s/Q̇t = (Cc′O2 − CaO2)/(Cc′O2 − Cv̄O2); physiologic dead space VD/VT = (PaCO2 − PĒCO2)/PaCO2, normally 0.2–0.35.' },
  { h: 'What this means at the bedside', ul: [
    'A PaO2 that rises little on 100% oxygen is shunt until proven otherwise; a shunt above 30% is severe.',
    'A rising end-tidal–arterial CO2 gap is dead space (embolism, low output, overdistension); a normal gap with high CO2 is hypoventilation.',
    'The DLCO falls with V/Q mismatch and with loss of capillary bed alike; KCO separates them only partly (see the DLCO topic).',
    'Ventilation–perfusion scintigraphy reads V/Q mismatch directly: a perfusion defect with preserved ventilation in a segmental distribution is the signature of embolism; matched defects are parenchymal. It remains the test of choice for suspected embolism in pregnancy, contrast allergy and renal failure.'] },
  { src: ['West JB, Luks AM. West’s Respiratory Physiology: The Essentials, 11th ed. Wolters Kluwer 2021 (chapters 5 and 7).', 'Petersson J, Glenny RW. Gas exchange and ventilation–perfusion relationships in the lung. Eur Respir J 2014;44:1023–41.'] }
] };

T.bronch_basics = { title: 'Flexible bronchoscopy: when and how safe', kicker: 'Indications · contraindications · complication rates', blocks: [
  { h: 'Indications you will meet', ul: [
    'Diagnosis and staging of lung cancer: a visible endobronchial tumour (CT first), nodal staging with EBUS-TBNA, peripheral nodules with navigation or a radial probe.',
    'Infection: airspace disease that non-invasive sampling has not explained, especially in the immunocompromised (BAL for Pneumocystis, fungi, viruses, mycobacteria); smear-negative tuberculosis; non-resolving pneumonia (11% harbour a carcinoma, particularly smokers over 50).',
    'Diffuse parenchymal disease: BAL cell counts, transbronchial biopsies (sarcoidosis, hypersensitivity pneumonitis, organising pneumonia) or cryobiopsy; a typical UIP pattern on HRCT does not need either.',
    'Haemoptysis after CT: localisation when CT is unrevealing, in the high-risk smoker, or when it continues.',
    'The ICU: lobar collapse not cleared by physiotherapy and suctioning, difficult airways, suspected VAP when blind sampling fails, inhalation injury.',
    'Therapeutic: foreign bodies, mucus plugs, central airway obstruction (dilatation, ablation, stents), bronchial thermoplasty, valves — mostly rigid or interventional work.'] },
  { h: 'Contraindications are mostly relative', ul: [
    'Recent myocardial infarction: delay 4 weeks if possible; within 30 days bronchoscopy carries 5% mortality limited to patients with active ischaemia (BTS, grade D). Liaise with cardiology for unstable or recent ischaemia and arrhythmia.',
    'Uncorrected bleeding tendency when biopsy is planned: platelets below 50,000/µL, INR above 1.5, PTT above 50 s are the usual correction thresholds; lavage alone is acceptable above 20,000/µL. Uraemia impairs platelets (desmopressin helps); clopidogrel must be off for 7 days before any biopsy.',
    'Severe hypoxaemia that oxygen does not correct, severe respiratory failure, haemodynamic instability, high PEEP in the ventilated patient, raised intracranial pressure, severe pulmonary hypertension (biopsy) and the uncooperative patient.',
    'Severe airflow obstruction (FEV1 under 1 L or under 50% predicted) is not a contraindication but predicts desaturation and complications — optimise the bronchodilators first and sedate carefully.',
    'Age alone is not a contraindication; the old need smaller sedative doses and have more pneumothoraces and hypotension.'] },
  { h: 'How often things go wrong', table: { head: ['Event', 'Rate', 'Comment'], rows: [
    ['Serious complication (any bronchoscopy)', '≈1%', 'BTS audit standard below 1%; mortality 0.02–0.1%'],
    ['Significant bleeding', '0.1–0.3% overall; ≈2% with transbronchial biopsy', 'Two-thirds of bleeders have normal coagulation and no risk factor'],
    ['Pneumothorax after transbronchial biopsy', '1–6% (up to 9% in diffuse disease)', '40% are delayed up to 2 h; 40–70% need a drain; ≈0.1% without biopsy'],
    ['Post-bronchoscopy fever', '5–10%; 13% after BAL', '4–24 h after, lasts ≈14 h, non-infective; antibiotics do not prevent it'],
    ['Desaturation below 90%', 'Common, transient', 'FEV1 under 1 L: half the patients; above 2 L: one in ten'],
    ['Arrhythmia', '≈40% have some during; major ones rare', 'Mostly on passing the cords and with the lowest SpO2']] },
    note: 'Transbronchial cryobiopsy bleeds far more than forceps biopsy (moderate or severe bleeding in 20% or more); endobronchial cryobiopsy about the same as forceps (≈18% needing intervention). EBUS-TBNA almost never bleeds (0.2%).' },
  { h: 'Monitoring', ul: [
    'Heart rate, respiratory rate, blood pressure and SpO2 recorded before, during and after; continuous pulse oximetry throughout; ECG when the arrhythmia risk is high; intravenous access before sedation and until discharge; resuscitation equipment and reversal agents in the room (BTS).',
    'Give oxygen when SpO2 falls more than 4 points or below 90% for more than a minute; expect hypoxaemia to persist 2 h after the procedure in some.',
    'Two trained nurses: one to assist, one dedicated to the patient (BTS, grade D).'] },
  { src: ['Du Rand IA, et al. British Thoracic Society guideline for diagnostic flexible bronchoscopy in adults. Thorax 2013;68(Suppl 1):i1–i44.', 'Youness HA, et al. Management of oral antiplatelet agents and anticoagulation therapy before bronchoscopy. J Thorac Dis 2017;9(Suppl 10):S1022–33 (bleeding rates by procedure).'] }
] };

T.bronch_prep = { title: 'Before the procedure', kicker: 'Checklist · consent · fasting · labs · drugs to stop', blocks: [
  { h: 'The safety checklist (BTS, adapted from the WHO surgical checklist)', ol: [
    'Before anything: team introduced by name and role; patient identity, procedure and consent confirmed; monitoring and drugs checked; allergies; antiplatelet or anticoagulant drugs.',
    'Before sedation: imaging reviewed and on the screen; blood results reviewed; the critical steps said aloud; scope sterility and reprocessing indicators confirmed by the nurse in charge.',
    'After: findings and drugs recorded, controlled drugs accounted for, specimens labelled with the patient’s name, equipment problems noted, concerns for recovery handed over.'] },
  { h: 'Consent and information', ul: [
    'Verbal and written information about why, what to expect and what can go wrong improves tolerance (grade C); the bronchoscopist or a trained delegate takes consent.',
    'Nothing to eat for 4 h; clear fluids until 2 h before (grade D).',
    'Sedated patients may not drive, operate machinery, drink alcohol or sign legal documents for 24 h and need an escort home; no food or drink until the throat numbness has worn off (about 2 h).',
    'Tell the patient about delayed pneumothorax after transbronchial biopsy and post-bronchoscopy fever, in writing, with what to do (grade D/C).'] },
  { h: 'Tests', ul: [
    'A chest CT before a diagnostic bronchoscopy for suspected cancer (grade D) and before bronchoscopy for haemoptysis.',
    'Coagulation studies, platelets and haemoglobin only when there is a clinical risk factor: anticoagulant therapy, liver disease, a personal or family bleeding history, active bleeding or pre-procedure transfusion (grade D). Routine clotting is not required.',
    'Spirometry or at least a sense of FEV1: below 1 L, half the patients desaturate below 90% and a third need oxygen.',
    'Check creatinine when planning DOAC interruption (hold times depend on clearance) and in uraemia (platelet dysfunction).'] },
  { h: 'Drugs', ul: [
    'No anticholinergic premedication (atropine, glycopyrrolate): no benefit, more tachycardia and hypertension (BTS grade A; ACCP 2011).',
    'Asthma: optimise control before BAL; consider a nebulised bronchodilator beforehand. COPD: optimise treatment; sedate cautiously (grade D).',
    'Antiplatelets and anticoagulants: see the next topic — aspirin continues, clopidogrel stops 7 days before any biopsy, warfarin 5 days with an INR below 1.5, DOACs 1–5 days by agent and renal function.',
    'Antibiotic prophylaxis is not indicated for endocarditis, fever or pneumonia (grade B).',
    'Diabetes: adjust insulin and oral agents for the fast; immunosuppression: note the risk and plan samples (BAL for Pneumocystis, galactomannan, mycobacteria, viruses).'] },
  { h: 'Bleeding: think before the first biopsy (BTS Appendix 6)', ol: [
    'Is the biopsy necessary? Few diagnoses are made reliably by transbronchial biopsy; nodal or extrathoracic sampling may be better in malignancy.',
    'Can the patient withstand a haemorrhage: physiologic reserve, a secure airway?',
    'If bleeding is likely and the biopsy must happen: good IV access, oxygen, a prophylactic local vasoconstrictor, the best first biopsy, argon plasma coagulation or a blocker to hand, senior help available, or do it rigid.'] },
  { src: ['Du Rand IA, et al. BTS guideline for diagnostic flexible bronchoscopy in adults. Thorax 2013;68(Suppl 1):i1–i44 (Appendices 5–7, 13).', 'Wahidi MM, et al. ACCP consensus statement on topical anesthesia, analgesia, and sedation during flexible bronchoscopy. Chest 2011;140:1342–50.'] }
] };

T.sedation = { title: 'Sedation and topical anaesthesia', kicker: 'Midazolam · fentanyl · propofol · lidocaine dose · reversal', blocks: [
  { h: 'Principles (ACCP 2011, BTS 2013)', ul: [
    'Offer sedation to everyone without a contraindication (grade B): tolerance, amnesia and willingness to repeat all improve, and the safety record equals that of unsedated bronchoscopy. Some patients tolerate it unsedated; ask.',
    'Target moderate (“conscious”) sedation: verbal contact possible at all times (grade D). Deeper sedation needs the care and monitoring of a general anaesthetic.',
    'Titrate — responses vary widely between patients; single large boluses are discouraged. Document the depth (Ramsay 2–3 or MOAAS 4–3).',
    'Benzodiazepine plus a short-acting opioid is the preferred combination (grade B): the opioid adds cough suppression and lowers the lidocaine and midazolam needed. Give the opioid first and let it peak before the midazolam (grade D).',
    'Propofol is as effective as midazolam–fentanyl with the same hypoxia rate and a faster recovery, but it has no reversal agent and a narrow window: only in the hands of someone trained to rescue from general anaesthesia, usually an anaesthetist (grade B). Fospropofol carries the same label.',
    'Midazolam: draw up no more than 5 mg under 70 years, 2 mg over 70, and keep only 1 mg/mL vials in the suite (BTS, grade D). Older patients, liver or heart failure and CYP3A4 inhibitors (azoles, macrolides, antiretrovirals, calcium-channel blockers) prolong its effect; transplant, cystic fibrosis and substance-use patients need more.'] },
  { h: 'Doses', table: { head: ['Drug', 'Initial', 'Supplement', 'Usual maximum', 'Onset / peak / duration'], rows: [
    ['Fentanyl IV', '25 µg over 1–3 min', '25 µg', '50 µg (more for long procedures)', 'Immediate / 5 min / 30–60 min'],
    ['Alfentanil IV', '250 µg', '250 µg', '500 µg', 'Immediate / immediate / shorter than fentanyl'],
    ['Midazolam IV (≤2 mg/min)', '2–2.5 mg (0.5–1 mg frail or elderly), 5–10 min before', '1 mg (0.5–1 mg frail) every 2–10 min', '3.5–7 mg (3.5 mg frail); 0.06–0.07 mg/kg in trials', '2 min / 5–10 min / 30–120 min'],
    ['Propofol IV (anaesthetist)', 'Titrated boluses or infusion', '—', 'To effect', '30 s / 2 min / 3–5 min'],
    ['Flumazenil IV', '0.2 mg over 15 s', '0.1–0.2 mg every 60 s', '1 mg', '1 min; lasts 30–60 min — shorter than midazolam, watch for re-sedation'],
    ['Naloxone IV', '0.1–0.2 mg', '0.1 mg every 2 min', '—', '1–2 min; lasts 45 min–4 h']] },
    note: 'The VA “full dose” for a standard BAL is 25 µg fentanyl with 1 mg midazolam (local protocol, 2024). When both a benzodiazepine and an opioid were given to an over-sedated patient, reverse with flumazenil first unless a large opioid dose was given (BTS).' },
  { h: 'Topical anaesthesia', ul: [
    'Lidocaine is the agent (grade A); cocaine (cardiovascular), benzocaine and tetracaine (methaemoglobinaemia) are discouraged.',
    'Nose: 2% gel, 6 mL (120 mg) (grade A). Oropharynx: 10% spray, 2–5 actuations of 10 mg, or a 1-minute gargle of 5 mL 2% (100 mg). Cords and tree: 1% solution “spray-as-you-go” in 2 mL boluses (grade A) — volume, not concentration, determines the effect. Nebulised lidocaine adds dose without benefit (grade B). Cricothyroid injection works but is not first-line (ACCP).',
    'Toxicity is dose-related: keep the total under 7 mg/kg (ACCP) — the local protocol aims under 8 mg/kg (560 mg for 70 kg); subjective toxicity (euphoria, dizziness, perioral paraesthesia) is common above 9.6 mg/kg, and seizures, arrhythmia and methaemoglobinaemia above a serum level of 5 mg/L. Peak absorption is 20–45 min after application. Liver disease, heart failure and age raise the risk; renal failure does not need dose adjustment.',
    'A good cough score needs less than 160 mg in total. Track every millilitre at every site; the calculator below keeps the running total.'] },
  { widget: 'lido' },
  { h: 'In the ICU', ul: [
    'Ventilated patients usually need deeper sedation or anaesthesia with analgesia, given by someone used to those drugs (grade D); fighting the ventilator is a cause of hypoxaemia during the procedure.',
    'Critically ill patients are more susceptible to lidocaine toxicity (renal failure, liver dysfunction, heart failure).'] },
  { src: ['Wahidi MM, et al. ACCP consensus statement on topical anesthesia, analgesia, and sedation during flexible bronchoscopy in adult patients. Chest 2011;140:1342–50.', 'Du Rand IA, et al. BTS guideline for diagnostic flexible bronchoscopy in adults. Thorax 2013;68(Suppl 1):i1–i44 (sedation section, Appendices 8–9).', 'Bronchoalveolar lavage protocol (local, July 2024): lidocaine preparations and the VA sedation dose.'] }
] };

T.antithrombotic = { title: 'Antiplatelets and anticoagulants', kicker: 'What to stop, when, and when to restart', blocks: [
  { h: 'Bleeding risk by procedure', table: { head: ['Procedure', 'Risk', 'Bleeding'], rows: [
    ['Inspection, BAL', 'Low', '<0.12% (more than 50 mL)'],
    ['EBUS-TBNA', 'Low', '0.2% needing intervention; <1% on aspirin, 0–8% on clopidogrel'],
    ['Endobronchial forceps biopsy', 'Intermediate', '0.45% mild–moderate'],
    ['Transbronchial forceps biopsy', 'Intermediate', '2–5%; 3.5% on aspirin (no excess); 89% on clopidogrel, 100% on both'],
    ['Endobronchial cryobiopsy', 'High', '18% needing intervention'],
    ['Transbronchial cryobiopsy', 'High', '9–53% (moderate or severe in a fifth)'],
    ['Therapeutic (central airway)', 'High', 'Mean 7 mL; 0.5% needing intervention']] },
    note: 'Youness 2017, Table 1. Correct platelets below 50,000/µL, INR above 1.5 and PTT above 50 s before biopsy; lavage is acceptable above 20,000/µL (BTS).' },
  { h: 'Antiplatelet drugs', ul: [
    'Aspirin: continue for everything, including transbronchial biopsy (BTS grade C; ACCP).',
    'Clopidogrel (and prasugrel, ticagrelor): stop 7 days before endobronchial or transbronchial biopsy; start aspirin meanwhile if not already taken; restart within 24 h. Small series suggest EBUS-TBNA can be done on clopidogrel, but holding it is still recommended.',
    'Coronary stents: involve cardiology. Within 6 weeks of a bare-metal stent or 6 months of a drug-eluting stent (BTS says 1 and 12 months) dual therapy continues — defer the biopsy or sample another way; if it cannot wait, bridge with an IV GP IIb/IIIa inhibitor (eptifibatide, tirofiban) or cangrelor; heparin has no role.',
    'Reversal is only by time: platelet function returns 10–14% a day after clopidogrel or aspirin; prasugrel and ticagrelor act within hours of restarting.'] },
  { h: 'Warfarin', ul: [
    'Stop 5 days before; check the INR the day before or the morning of the procedure (target below 1.5; 1–2.5 mg oral vitamin K if it is not); restart the usual dose 12–24 h after (the evening of the procedure), INR in a week.',
    'Bridge only when the thromboembolic risk is high: mechanical mitral valve, caged-ball or tilting-disc aortic valve, stroke or TIA within 6 months, atrial fibrillation with CHADS2 5–6 or rheumatic mitral disease, VTE within 3 months or severe thrombophilia. Start LMWH (unfractionated heparin if creatinine clearance is below 30 mL/min) when the INR falls below range; last LMWH 24 h before, heparin off 4–6 h before; resume heparin 48–72 h after (earlier after BAL or EBUS with full haemostasis) until the INR is therapeutic.',
    'In atrial fibrillation without those features, bridging adds major bleeding without preventing thromboembolism (BRIDGE trial).'] },
  { h: 'Direct oral anticoagulants (days to hold before; resume 48–72 h after)', table: { head: ['Agent', 'Creatinine clearance (mL/min)', 'Standard-risk procedure', 'High bleeding risk'], rows: [
    ['Dabigatran', '≥50', '1 day', '2–3 days'],
    ['', '30–50', '2 days', '4 days'],
    ['', '<30', '2–4 days', '>5 days'],
    ['Rivaroxaban', '>90 / 60–90 / 30–59 / 15–29', '≥1 / 2 / 3 / 4 days', 'Longer'],
    ['Apixaban', '>60 / 50–59 / <50', '1–2 / 3 / 5 days', 'Longer'],
    ['Edoxaban', '>80 / 50–80 / 15–49', '1 / 1–2 / 2–3 days', 'Longer']] },
    note: 'No bridging for DOACs: their onset is immediate, so resume only when haemostasis is secure — later after transbronchial biopsy than after BAL or EBUS-TBNA. Reversal in an emergency: idarucizumab or dialysis for dabigatran; prothrombin complex concentrate (andexanet where available) for the Xa inhibitors; vitamin K plus PCC for warfarin; protamine for heparin.' },
  { h: 'Thromboembolic risk without anticoagulation (ACCP)', table: { head: ['Indication', 'High (>10%/yr)', 'Moderate (5–10%)', 'Low (<5%)'], rows: [
    ['Mechanical valve', 'Any mitral; caged-ball or tilting-disc aortic; stroke/TIA within 6 months', 'Bileaflet aortic with AF, prior stroke, hypertension, diabetes, heart failure or age >75', 'Bileaflet aortic without risk factors'],
    ['Atrial fibrillation', 'CHADS2 5–6; stroke/TIA within 3 months; rheumatic valve disease', 'CHADS2 3–4', 'CHADS2 0–2'],
    ['Venous thromboembolism', 'Within 3 months; severe thrombophilia', '3–12 months ago; non-severe thrombophilia; recurrent VTE; active cancer', 'More than 12 months ago, no other risk']] } },
  { src: ['Youness HA, Keddissi J, Berim I, Awab A. Management of oral antiplatelet agents and anticoagulation therapy before bronchoscopy. J Thorac Dis 2017;9(Suppl 10):S1022–33.', 'Du Rand IA, et al. BTS guideline for diagnostic flexible bronchoscopy in adults. Thorax 2013;68(Suppl 1):i1–i44 (Appendix 7, after Veitch et al, Gut 2008).', 'Douketis JD, et al. Perioperative bridging anticoagulation in patients with atrial fibrillation (BRIDGE). N Engl J Med 2015;373:823–33.'] }
] };

T.bal = { title: 'Bronchoalveolar lavage', kicker: 'Protocol · wedge · aliquots · what the cells mean', blocks: [
  { h: 'When', ul: [
    'Airspace infection (especially in the immunocompromised), diffuse alveolar haemorrhage, interstitial lung disease, eosinophilic lung disease, alveolar proteinosis, suspected malignancy with lymphangitic spread.',
    'Against it: haemodynamic instability, severe respiratory failure, high PEEP in the intubated patient, traumatic brain injury or raised intracranial pressure (local protocol); asthma should be optimised first because BAL drops FEV1 and provokes symptoms.'] },
  { h: 'The protocol (local, July 2024, with BTS Appendix 10)', ol: [
    'Equipment: swivel adaptor for the endotracheal tube, lidocaine (2% below the cords, 4% above at the VA), lidocaine jelly for the scope, saline (bag or 500 mL bottle and a basin), 30 mL slip-tip syringes, specimen trap and cup, working suction.',
    'Topical anaesthesia with a running total: gargle 5 mL of 2% (100 mg) for a minute, atomiser 10 mL of 2% (200 mg), then 1 mL syringes of 2% (20 mg each) twice on the cords and twice on the main carina. Intubated patients need no upper-airway anaesthesia but still need lidocaine at the carina. Stay under 8 mg/kg.',
    'Sedation: fentanyl 25 µg with midazolam 1 mg is the VA full dose; titrate.',
    'Do not suction through the working channel before the lavage when infection is the question — the channel carries upper-airway flora. Use low suction pressure during the lavage so the walls do not collapse.',
    'Pick the segment: the abnormal area for focal disease; for diffuse disease the right middle lobe or the superior segment of the lingula, where gravity returns the most fluid in a supine patient.',
    'Wedge: advance until the scope occludes the lumen completely so that nothing seeps back proximally. Air in the syringe or a falling return means the wedge is incomplete; poor return with the walls collapsing on suction means over-wedged.',
    'Instil 30 mL of saline three or four times (BTS: 60–180 mL in total); the segment should distend and blanch; aspirate with no air in the syringe. More than 20 mL returned is adequate for the laboratory. Discard or label the first aliquot separately for cytology if the laboratory asks (it samples the airway more than the alveoli).',
    'Intubated patients: pre-oxygenate with FiO2 1.0, clear secretions with in-line suction first, keep a mandatory ventilator mode and a perforated-diaphragm swivel to preserve PEEP, and expect a fall in tidal volume and PaO2/FiO2 of up to 80% for an hour. The scope should occupy less than half the tube (a 5.7 mm scope needs a 8.0 tube or larger).'] },
  { h: 'Reading the differential (ATS 2012)', table: { head: ['Finding', 'Threshold', 'Think of'], rows: [
    ['Normal', 'Macrophages >85%, lymphocytes 10–15%, neutrophils ≤3%, eosinophils ≤1%, squamous or ciliated cells <5%', 'A clean sample'],
    ['Lymphocytosis', '>15% (>25% is strongly granulomatous or cellular)', 'Sarcoidosis, hypersensitivity pneumonitis, NSIP, drug reaction, lymphoma, berylliosis; >50% favours hypersensitivity pneumonitis or cellular NSIP'],
    ['CD4/CD8 ratio', '>4 with lymphocytosis', 'Sarcoidosis (low ratio favours hypersensitivity pneumonitis)'],
    ['Neutrophilia', '>3% (>50% acute)', 'Infection, aspiration, acute lung injury, DAD, smoking, IPF and other fibrosing disease'],
    ['Eosinophilia', '>1% abnormal; >25% diagnostic territory', 'Eosinophilic pneumonia, drug reaction, ABPA, Churg-Strauss, parasites'],
    ['Haemosiderin-laden macrophages', '>20%, or progressively bloodier aliquots', 'Diffuse alveolar haemorrhage'],
    ['Milky fluid, PAS-positive material', '—', 'Pulmonary alveolar proteinosis'],
    ['Malignant cells, lipid-laden macrophages, Langerhans cells (CD1a >5%)', '—', 'Lymphangitic carcinoma; aspiration or lipoid pneumonia; Langerhans cell histiocytosis']] },
    note: 'Send for cell count and differential, bacterial, fungal and mycobacterial stains and cultures, Pneumocystis stain or PCR, viral PCR, galactomannan when invasive aspergillosis is possible (sensitivity ≈94%), Legionella PCR in community-acquired pneumonia, cytology. Quantitative culture thresholds: BAL ≥10⁴ CFU/mL, protected brush ≥10³.' },
  { src: ['Bronchoalveolar lavage protocol (local, SK, July 2024).', 'Du Rand IA, et al. BTS guideline for diagnostic flexible bronchoscopy in adults. Thorax 2013;68(Suppl 1):i1–i44 (Appendix 10; infection section).', 'Meyer KC, et al. An official ATS clinical practice guideline: the clinical utility of bronchoalveolar lavage cellular analysis in interstitial lung disease. Am J Respir Crit Care Med 2012;185:1004–14.'] }
] };

T.sampling = { title: 'Biopsy, brush and needle', kicker: 'How many, where, what yield, what to do when it bleeds', blocks: [
  { h: 'Numbers to remember (BTS 2013)', ul: [
    'Visible endobronchial tumour: at least five forceps biopsies (90% probability of a positive biopsy; phenotyping and genotyping need tissue); a diagnostic rate of 85% is the audit standard; brushings and washings add a little; order does not matter but take the biopsies first.',
    'Diffuse parenchymal disease: five or six transbronchial biopsies from the same lung (yield rises from 35% with 1–3 to about 70% with 6–10); fluoroscopy helps for focal disease, not diffuse.',
    'Sarcoidosis: endobronchial biopsies even from normal-looking mucosa, transbronchial biopsies for stage II–IV, and nodal EBUS-TBNA — together close to 90%.',
    'Peripheral nodules: conventional transbronchial yield depends on size and a bronchus sign; the radial probe and navigation raise it but do not match CT-guided biopsy for small, pleura-based lesions.'] },
  { h: 'Technique', ul: [
    'Endobronchial biopsy: secure the scope, advance the closed forceps, open at the lesion, advance, close and pull with a tug; alligator or cup forceps are equivalent.',
    'Transbronchial biopsy: wedge in the chosen segment, advance the forceps gently until resistance, pull back 1–2 cm from the pleura, open during a slow deep breath, advance and close on expiration, withdraw. Pleuritic pain means pleura in the forceps — open and remove without biopsy. Light sedation keeps the patient able to follow breathing commands.',
    'Brush: pushed from its sheath, worked back and forth over the lesion, withdrawn into the sheath before removal.',
    'Conventional TBNA: 19–22 gauge through the wall at the carina or a lobar carina; EBUS-TBNA under direct ultrasound sight for mediastinal and hilar nodes (see the stations topic).',
    'Cryobiopsy: larger, crush-free samples for interstitial disease with more bleeding and pneumothorax — an airway blocker in place, usually under general anaesthesia.'] },
  { h: 'Bleeding, graded', table: { head: ['Grade', 'What you see', 'What you do'], rows: [
    ['None', 'Traces, no continuous suction', 'Carry on'],
    ['Mild', 'Continuous suction of blood, stops by itself', 'Keep the scope in place, suction'],
    ['Moderate', 'Needs the scope wedged in the bleeding segment and adrenaline or cold saline', 'Wedge 10–15 min, 5–10 mL 1:10,000 adrenaline or 4 °C saline'],
    ['Severe', 'Blocker, fibrin sealant, resuscitation, transfusion, ICU or death', 'Balloon or bronchial blocker, turn the bleeding side down, airway control, help']] },
    note: 'Management sequence (BTS Appendix 6): oxygen and IV access · pull the scope back to keep vision and suction free blood, never the clot · bleeding side down · adrenaline or iced saline · wedge the segment 10–15 minutes · balloon catheter to isolate it · check platelets, PT, PTT and the drug history · senior help, critical care. Bleeding after TBB is mild in 92% and under 20 mL.' },
  { h: 'After biopsies', ul: [
    'A chest radiograph after transbronchial biopsy only when symptomatic or suspected pneumothorax — or at least 2 h after; a routine film in the asymptomatic patient rarely changes anything. Warn about delayed pneumothorax in writing.',
    'Keep watching for pneumothorax after ICU bronchoscopy even without a biopsy.',
    'Lung transplant recipients bleed more (more than 25 mL in 44%) and transbronchial biopsy is their rejection test; biopsy under clopidogrel is close to guaranteed bleeding.'] },
  { src: ['Du Rand IA, et al. BTS guideline for diagnostic flexible bronchoscopy in adults. Thorax 2013;68(Suppl 1):i1–i44 (diagnostic accuracy; Appendices 6 and 10).', 'Youness HA, et al. J Thorac Dis 2017;9(Suppl 10):S1022–33 (bleeding definitions and rates).'] }
] };

T.icu = { title: 'Bronchoscopy for infection and in the ICU', kicker: 'Who to lavage · what to send · ventilated patients', blocks: [
  { h: 'The immunocompromised host (BTS Figure 1)', ol: [
    'Clinical suspicion of infection and non-invasive sampling unsuitable or non-diagnostic → bronchoscopy with BAL.',
    'Tuberculosis unlikely: BAL alone is usually enough (grade C). Send microscopy and culture including acid-fast bacilli and mycobacterial culture (grade C), Pneumocystis, viruses; galactomannan when invasive aspergillosis is possible (sensitivity 94%, specificity 79%; false positives with some β-lactams) — it spares the biopsy (grade C).',
    'Tuberculosis possible or a high-prevalence population: add transbronchial biopsy, TB PCR, and collect post-bronchoscopy sputum for acid-fast bacilli (grade D).',
    'BAL for Pneumocystis is 90–98% sensitive before treatment and about 64% after empiric therapy; bilateral or upper-lobe sampling raises the yield. Early bronchoscopy is associated with lower mortality than delayed.'] },
  { h: 'The immunocompetent host', ul: [
    'Non-resolving or slowly resolving pneumonia, especially in smokers over 50 (grade C): 11% have a carcinoma.',
    'Community-acquired pneumonia at bronchoscopy: send BAL for Legionella PCR and atypical pathogens (grade C); pneumococcal antigen on BAL is 54–95% sensitive.',
    'Smear-negative tuberculosis: BAL, bronchial aspirates and post-bronchoscopy sputum are complementary — analyse all three (grade C); combined culture yield 69–94%; BAL PCR about 80%. In intermediate- or high-prevalence settings send TB cultures from every bronchoscopy (grade C).',
    'Suspected TB: negative-pressure or appropriately ventilated room and respirator masks for the team.'] },
  { h: 'Ventilated patients', ul: [
    'Treat every ICU bronchoscopy as high risk; correct what can be corrected first — ventilator settings, clotting, platelets (grade D). Two deaths in 37 ventilated patients with platelets under 50,000 (one from airway bleeding).',
    'Scope versus tube: a 5.7 mm scope fills 40% of a 9.0 tube and two-thirds of a 7.0; choose the scope by the airway device (grade D) — roughly, an 8.0 tube takes a scope up to 5.3 mm and a 9.0 up to 7.3 mm (BTS Appendix 11); a 7.0 tube is too small for a standard adult scope — use a slim one.',
    'Pre-oxygenate with FiO2 1.0 and keep it through recovery; a mandatory mode (triggered modes will not maintain ventilation), raised pressure limit, a perforated-diaphragm swivel to keep PEEP; expect PaO2/FiO2 to fall by up to 80% after BAL, for about an hour, and transient rises in PA pressure and CO2.',
    'Suspected VAP: non-invasive sampling (blind catheter aspirate) first (grade A); bronchoscopy when it fails to identify an organism (grade D) — invasive sampling does not change mortality, ICU stay or antibiotic use.',
    'Lobar collapse: bronchoscopy may be considered when physiotherapy and suctioning fail (grade D); routine prophylactic lavage after lobectomy does not help (grade A).',
    'Haemoptysis: CT first; bronchoscopy when CT is unhelpful or impossible (grade D) — it finds the side in 89%, CT the cause.',
    'Hypoxaemic non-intubated patients: CPAP with oxygen during the procedure prevents desaturation and later ventilation (grade B); if NIV is needed beforehand, do it where intubation is immediately available (grade D) — half are intubated within 48 h. Raised intracranial pressure: bronchoscopy raises it further; deep sedation and caution (grade D).',
    'Transbronchial biopsy in ventilated patients: 46% yield, 31% significant complications — rarely worth it; TBNA of nodes is safer.'] },
  { src: ['Du Rand IA, et al. BTS guideline for diagnostic flexible bronchoscopy in adults. Thorax 2013;68(Suppl 1):i1–i44 (infection and ICU sections; Appendix 11).', 'Bronchoalveolar lavage protocol (local, July 2024): intubated patients.'] }
] };

T.ebus = { title: 'EBUS-TBNA essentials', kicker: 'The scope · the picture · the needle', blocks: [
  { h: 'The instrument', ul: [
    'A convex-probe scope (Olympus BF-UC180F/190F, Pentax EB-1970UK, Fujinon EB-530US): a 6.2–6.9 mm insertion tube, a 2.2 mm working channel, a 30–35° forward-oblique optical view and a 7.5–12 MHz linear transducer at the tip scanning in the plane of the scope, with a saline-filled balloon for contact.',
    'Because the camera looks 30° up from the scope’s axis, the picture shows the wall ahead rather than the lumen: keep the scope pushed against the wall you are scanning and steer by the ultrasound, not the camera. Advance through the cords and the carina with the tip flexed a little down to see where you are going.',
    'The needle (19, 21 or 22 gauge) leaves the channel at about 20–25° to the axis; the depth of penetration and the distance from the tip are set on the handle, and the needle must be visible along its length on the ultrasound before advancing (ATS boot-camp 2019).'] },
  { h: 'Reading the picture', ul: [
    'Vessels are anechoic, pulsatile and light up on colour Doppler; nodes are hypoechoic, oval or round, with or without an echogenic hilum; the lung is bright and noisy beyond the pleura; cartilage rings make bright arcs close to the probe.',
    'Landmarks by station: 2R — brachiocephalic vessels; 4R — SVC lateral, azygos caudal; 4L — aortic arch above, left PA below; 7 — no vessel, oesophagus behind, left atrium below; 10R — distal to the azygos; 10L — left PA directly behind; 11 — the lobar carinae. The stations topic has the full map.',
    'Measure the short axis; ≥5 mm is sampled in systematic staging; ≥1 cm is “enlarged” on CT.'] },
  { h: 'The pass', ol: [
    'Position the transducer on the node, Doppler on, then off; lock the scope.',
    'Advance the sheath 2 mm beyond the channel so the needle exits clear of the scope; jab the needle through the wall between cartilage rings with a short, firm thrust.',
    'Withdraw the stylet a few millimetres to clear the plug, then remove it; apply suction (optional) and move the needle 10–20 times within the node under sight.',
    'Release suction before withdrawing; express onto slides or into saline, formalin or RPMI; three passes per node, or until rapid on-site evaluation is adequate.',
    'Sample N3 first, then N2, then N1; the same needle may be used from higher to lower stage, never the reverse.'] },
  { h: 'Yield and safety', ul: [
    'Sensitivity for mediastinal staging about 90% with a negative predictive value about 90% in surgical series; adding EUS-B raises completeness. Confirm a negative result surgically when the pretest probability is high.',
    'Complications under 1.5%: bleeding needing intervention 0.2%, pneumothorax, infection (mediastinitis, pericarditis — rare), scope damage. No excess bleeding on aspirin; clopidogrel is still held.',
    'Beyond staging: sarcoidosis (granulomas in about 80%), lymphoma (cores help), tuberculous adenitis, cysts (aspirate with antibiotics), central masses next to the airway, and the left adrenal and liver through the oesophagus.'] },
  { src: ['Bronchoscopy for hot shots: EBUS-TBNA — ATS Resident Boot Camp 2019 (Diaz-Mendoza J, Makani S).', 'Regional lymph node mapping with EBUS-TBNA (Olympus teaching chart).', 'Silvestri GA, et al. Methods for staging non-small cell lung cancer: ACCP guideline, 3rd ed. Chest 2013;143(5 Suppl):e211S–e250S.', 'Wahidi MM, et al. Technical aspects of endobronchial ultrasound-guided transbronchial needle aspiration: CHEST guideline and expert panel report. Chest 2016;149:816–35.'] }
] };

const GROUPS = [
  { title: 'Anatomy', ids: ['airway', 'tree', 'stations', 'vq'] },
  { title: 'Bronchoscopy', ids: ['bronch_basics', 'bronch_prep', 'sedation', 'antithrombotic', 'bal', 'sampling', 'icu', 'ebus'] }
];

root.PFT_ANAT = { topics: T, groups: GROUPS, TREE: TREE, TREE3D: TREE3D, STATIONS: STATIONS, SEGMENTS: SEGMENTS, LANDMARKS: LANDMARKS, SONO: SONO };
if (typeof module !== 'undefined' && module.exports) module.exports = root.PFT_ANAT;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
