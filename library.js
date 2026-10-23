/* No Mercy — exercise library, session content, sports and default settings.
   Plain data. Everything here can be edited from the app's Settings → Library screen. */
(function (G) {
'use strict';
const L = {};

// ---------------------------------------------------------------------------
// Muscles (id, name, half-life class) and joints
// ---------------------------------------------------------------------------
L.MUSCLES = [
  ['chest', 'Chest', 'big'], ['fdelt', 'Front delts', 'med'], ['sdelt', 'Side delts', 'med'],
  ['rdelt', 'Rear delts', 'med'], ['cuff', 'Rotator cuff', 'small'], ['triceps', 'Triceps', 'med'],
  ['biceps', 'Biceps', 'med'], ['forearms', 'Forearms & grip', 'small'], ['lats', 'Lats', 'big'],
  ['upback', 'Upper back & traps', 'med'], ['lowback', 'Lower back', 'big'], ['abs', 'Abs & deep core', 'med'],
  ['obliques', 'Obliques', 'med'], ['hipflex', 'Hip flexors', 'med'], ['glutes', 'Glutes', 'big'],
  ['gmed', 'Glute medius', 'med'], ['adductors', 'Adductors', 'med'], ['quads', 'Quads', 'big'],
  ['hamstrings', 'Hamstrings', 'big'], ['calves', 'Calves', 'small'], ['soleus', 'Soleus', 'small'],
  ['tib', 'Tibialis & feet', 'small'], ['neck', 'Neck', 'small'], ['impact', 'Impact (jumps, sprints, landings)', 'big']
].map(([id, name, hl]) => ({ id, name, hl }));
L.MUSCLE = Object.fromEntries(L.MUSCLES.map(m => [m.id, m]));

L.JOINTS = [
  ['neck', 'Neck', false], ['shoulder', 'Shoulder', true], ['elbow', 'Elbow', true], ['wrist', 'Wrist', true],
  ['lowback', 'Lower back', false], ['hip', 'Hip', true], ['knee', 'Knee', true], ['ankle', 'Ankle', true]
].map(([id, name, sided]) => ({ id, name, sided }));

// ---------------------------------------------------------------------------
// Equipment. def = ticked on first run. group drives the Settings checklist.
// ---------------------------------------------------------------------------
L.EQUIPMENT = [
  // Standard gym kit (assumed)
  ['barbell', 'Barbell and plates', 'have', true], ['rack', 'Squat rack or stands', 'have', true],
  ['bench', 'Flat/incline bench', 'have', true], ['dumbbells', 'Dumbbells', 'have', true],
  ['plates', 'Loose plates', 'have', true], ['machines', 'Standard machines', 'have', true],
  ['cables', 'Cable stations', 'have', true], ['tbar_station', 'T-bar row', 'have', true],
  ['pullup_bar', 'Pull-up bar', 'have', true], ['treadmill', 'Treadmill', 'have', true],
  ['back_ext', '45° back-extension bench', 'have', true], ['leg_press', 'Leg press', 'have', true],
  ['calf_machine', 'Calf raise machines', 'have', true],
  // Listed as "have"
  ['kettlebells', 'Kettlebells', 'have', true], ['trap_bar', 'Trap bar', 'have', true],
  ['grip_tools', 'Grip tools (grippers)', 'have', true],
  // Not sure
  ['dip_station', 'Dip station', 'unsure', false], ['power_rack', 'Power rack (pins)', 'unsure', false],
  ['smith', 'Smith machine', 'unsure', false], ['plyo_box', 'Plyo box', 'unsure', false],
  ['rings', 'Gymnastic rings', 'unsure', false], ['landmine', 'Landmine', 'unsure', false],
  ['abad_machine', 'Hip abductor/adductor machine', 'unsure', false],
  // Don't have
  ['neck_harness', 'Neck harness', 'no', false], ['tib_bar', 'Tib bar', 'no', false],
  ['ghd', 'GHD / reverse hyper', 'no', false], ['sled', 'Sled', 'no', false],
  ['battle_ropes', 'Battle ropes', 'no', false],
  // Extras the system can use
  ['dip_belt', 'Dip belt', 'extra', false], ['ankle_strap', 'Cable ankle strap', 'extra', false],
  ['jump_rope', 'Jump rope', 'extra', false], ['ab_wheel', 'Ab wheel', 'extra', false],
  ['climbing_rope', 'Climbing rope', 'extra', false], ['micro_plates', 'Micro plates (0.5–1.25 kg)', 'extra', false],
  ['cardio_alt', 'Stair climber, rower or air bike', 'extra', false], ['foam_roller', 'Foam roller', 'extra', false],
  ['partner', 'Partner available', 'extra', false]
].map(([id, name, group, def]) => ({ id, name, group, def }));
L.EQUIP_GROUPS = { have: 'You have', unsure: 'Not sure — tick when confirmed', no: "Don't have", extra: 'Extras the app can use' };

// ---------------------------------------------------------------------------
// Exercises
// k: lift (load × reps) | bwlift (bodyweight + added load) | reps (bodyweight reps) | hold (seconds) | carry (metres)
// c: anchor | staple | extra | area | variant
// m/h/n: main / helper / minor muscles. j: joints loaded. e: equipment needed. alt: fallback when kit is missing.
// cal: calibration plan (true = generic ramp). start: starting load (kg) from your numbers.
// ---------------------------------------------------------------------------
L.EXERCISES = {};
function X(id, name, o) {
  L.EXERCISES[id] = Object.assign({
    id, name, k: 'lift', c: 'staple', m: [], h: [], n: [], j: [], e: [], alt: null,
    step: 2.5, start: null, cal: null, rest: 180, min: 8, iso: false, uni: false,
    cues: [], how: '', note: '', minGap: 0
  }, o);
}

// ----- Anchors -----
X('squat', 'Barbell back squat', { c: 'anchor', m: ['quads', 'glutes'], h: ['adductors', 'lowback'], n: ['hamstrings', 'abs'], j: ['knee', 'hip', 'lowback'], e: ['barbell', 'rack'], step: 5, cal: { ramp: [[20, 8], [40, 5], [50, 3], [60, 1]], at: 65 }, rest: 300, min: 15,
  cues: ['Brace hard, then sit down between your heels', 'Hips below knees, 1 s dead stop at the bottom', 'Knees track your toes; stand up without bouncing'] });
X('dips', 'Parallel-bar dips', { c: 'anchor', k: 'bwlift', m: ['chest', 'triceps'], h: ['fdelt'], j: ['shoulder', 'elbow'], e: ['dip_station'], alt: 'dips_machine', cal: { bw: true }, rest: 240, min: 11,
  cues: ['Slight forward lean, elbows tucked', 'Lower until shoulders are below elbows, 1 s pause', 'No bounce out of the bottom; lock out at the top'] });
X('dips_machine', 'Dips on the assisted-dip machine (zero assist)', { c: 'variant', k: 'bwlift', m: ['chest', 'triceps'], h: ['fdelt'], j: ['shoulder', 'elbow'], e: ['machines'], alt: 'bench_dips', cal: { bw: true }, rest: 240, min: 11,
  cues: ['Set the assist to zero, use the handles as dip bars', 'Lower until shoulders are below elbows, 1 s pause', 'No bounce; lock out at the top'],
  how: 'Use the assisted-dip machine with zero assist (or step off the pad) as a dip station.' });
X('bench_dips', 'Feet-up bench dips, plate on lap', { c: 'variant', k: 'bwlift', m: ['triceps', 'chest'], h: ['fdelt'], j: ['shoulder', 'elbow', 'wrist'], e: ['bench'], step: 5, cal: { bw: true }, rest: 240, min: 11,
  cues: ['Hands on one bench, heels on another', 'Lower until upper arms are level, 1 s pause', 'A plate on your thighs adds the load'],
  how: 'Hands on a bench behind you, heels on a second bench, plate on your thighs.' });
X('chins', 'Chin-ups', { c: 'anchor', k: 'bwlift', m: ['lats', 'biceps'], h: ['forearms', 'upback'], n: ['rdelt'], j: ['shoulder', 'elbow', 'wrist'], e: ['pullup_bar'], cal: { bw: true }, rest: 240, min: 11,
  cues: ['Underhand grip, shoulder width', 'Dead hang to chin over the bar', '4 s down; no kipping or swing'] });
X('bench', 'Bench press', { c: 'anchor', m: ['chest'], h: ['fdelt', 'triceps'], j: ['shoulder', 'elbow', 'wrist'], e: ['barbell', 'bench', 'rack'], start: 55, rest: 240, min: 11,
  cues: ['Shoulder blades pinned back and down', 'Bar to lower chest, 1 s pause on the chest', 'Feet planted; press up and slightly back'] });
X('deadlift', 'Deadlift (conventional)', { c: 'anchor', m: ['hamstrings', 'lowback'], h: ['glutes', 'quads', 'upback', 'forearms', 'adductors'], n: ['lats', 'abs'], j: ['lowback', 'hip', 'knee'], e: ['barbell'], step: 5, cal: { ramp: [[60, 5], [80, 3], [90, 1]], at: 95 }, rest: 300, min: 15,
  cues: ['Bar over midfoot, shins touching the bar', 'Brace, pull the slack out, push the floor away', 'Lower under control; dead stop on the floor every rep'] });
X('pullups', 'Pull-ups', { c: 'anchor', k: 'bwlift', m: ['lats'], h: ['biceps', 'forearms', 'upback'], n: ['rdelt', 'abs'], j: ['shoulder', 'elbow', 'wrist'], e: ['pullup_bar'], start: 0, rest: 240, min: 11,
  cues: ['Overhand grip, shoulder width', 'Dead hang start; chin clears the bar', '4 s down; no swing'] });
X('military', 'Standing military press', { c: 'anchor', m: ['fdelt', 'triceps'], h: ['sdelt', 'upback', 'abs'], n: ['glutes', 'lowback'], j: ['shoulder', 'elbow', 'wrist', 'lowback'], e: ['barbell', 'rack'], cal: { ramp: [[20, 8], [25, 4]], at: 30 }, rest: 240, min: 11,
  cues: ['Squeeze glutes and abs; no leg drive', 'Bar from collarbone to lockout over midfoot', 'Head through at the top; 1 s pause at the collarbone'] });

// ----- Staples (your current gym lifts) -----
X('leg_ext', 'Leg extension', { m: ['quads'], j: ['knee'], e: ['machines'], step: 5, start: 60, rest: 150, min: 7, iso: true,
  cues: ['Pad on your lower shins, back against the seat', '1 s squeeze at the top', '4 s down; don\'t let the stack rest'] });
X('leg_curl', 'Leg curl', { m: ['hamstrings'], j: ['knee'], e: ['machines'], step: 5, start: 60, rest: 150, min: 7, iso: true,
  cues: ['Hips pressed into the pad', 'Curl fully, 1 s squeeze', '4 s back to straight legs'] });
X('incline_db', 'Incline dumbbell press', { m: ['chest'], h: ['fdelt', 'triceps'], j: ['shoulder', 'elbow', 'wrist'], e: ['dumbbells', 'bench'], start: 20, rest: 180, min: 8, note: 'kg per hand',
  cues: ['Bench at 30–45°', 'Elbows about 45° from your body', 'Deep stretch at the bottom, 1 s pause'] });
X('pec_fly', 'Pec fly machine', { m: ['chest'], n: ['fdelt'], j: ['shoulder'], e: ['machines'], step: 5, start: 60, rest: 150, min: 7, iso: true,
  cues: ['Slight, fixed bend in the elbows', 'Stretch wide, 1 s pause', 'Squeeze the handles together for 1 s'] });
X('oh_tri', 'Overhead triceps extension (cable)', { m: ['triceps'], j: ['elbow', 'shoulder'], e: ['cables'], start: 25, rest: 150, min: 7, iso: true,
  cues: ['Elbows forward, close to your head', 'Deep stretch behind your head, 1 s pause', 'Lock out fully'] });
X('pushdown_bar', 'Triceps pushdown (bar)', { m: ['triceps'], j: ['elbow'], e: ['cables'], step: 5, start: 45, rest: 150, min: 7, iso: true,
  cues: ['Elbows pinned to your sides', 'Lock out and squeeze 1 s', '4 s back up to about 90°'] });
X('pushdown_rope', 'Triceps pushdown (rope)', { m: ['triceps'], j: ['elbow'], e: ['cables'], step: 5, start: 25, rest: 150, min: 7, iso: true,
  cues: ['Elbows pinned to your sides', 'Spread the rope at the bottom, squeeze 1 s', '4 s back up to about 90°'] });
X('bench_curl', 'Single-arm bench curl', { m: ['biceps'], j: ['elbow'], e: ['dumbbells', 'bench'], start: 5, rest: 150, min: 7, iso: true, uni: true, note: 'kg per hand',
  cues: ['Upper arm braced on the bench', 'Full stretch at the bottom; no swing', 'Squeeze 1 s at the top'] });
X('hammer', 'Hammer curl (single arm)', { m: ['biceps', 'forearms'], j: ['elbow', 'wrist'], e: ['dumbbells'], start: 12.5, rest: 150, min: 7, iso: true, uni: true, note: 'kg per hand',
  cues: ['Neutral grip, elbow at your side', 'No body swing', '4 s down to a full stretch'] });
X('lateral', 'Lateral raise', { m: ['sdelt'], h: ['upback'], j: ['shoulder'], e: ['dumbbells'], start: 5, rest: 150, min: 7, iso: true, note: 'kg per hand',
  cues: ['Lead with the elbows, slight bend', 'Raise to shoulder height, 1 s pause', '4 s down; no shrugging'] });
X('tbar', 'T-bar row', { m: ['upback', 'lats'], h: ['biceps', 'lowback', 'rdelt'], j: ['lowback', 'shoulder', 'elbow'], e: ['tbar_station'], start: 40, rest: 180, min: 8,
  cues: ['Flat back, hinge or chest on the pad', 'Pull to the lower chest, 1 s squeeze', '4 s down to a full stretch'] });
X('seated_row', 'Seated cable row', { m: ['upback', 'lats'], h: ['biceps', 'rdelt'], j: ['shoulder', 'elbow'], e: ['cables'], step: 5, start: 50, rest: 180, min: 8,
  cues: ['Sit tall; no rocking', 'Pull to the belly, squeeze the shoulder blades 1 s', 'Let the shoulders stretch forward on the way back'] });
X('pulldown', 'Lat pulldown', { m: ['lats'], h: ['biceps', 'upback'], j: ['shoulder', 'elbow'], e: ['machines'], step: 5, start: 65, rest: 180, min: 7,
  cues: ['Thighs locked under the pads', 'Pull to the upper chest, elbows down and back', 'Full stretch at the top, 1 s pause'] });
X('pullover', 'Cable pullover (straight-arm)', { m: ['lats'], h: ['chest'], n: ['triceps'], j: ['shoulder'], e: ['cables'], step: 5, cal: true, rest: 150, min: 7, iso: true,
  cues: ['Hinge slightly, arms nearly straight', 'Sweep the bar down to your thighs', '4 s back up to a full overhead stretch'] });
X('rear_delt', 'Rear-delt machine', { m: ['rdelt'], h: ['upback', 'cuff'], j: ['shoulder'], e: ['machines'], step: 5, start: 45, rest: 150, min: 7, iso: true,
  cues: ['Chest on the pad, arms slightly bent', 'Sweep back, 1 s squeeze', 'Don\'t shrug'] });

// ----- Extra compounds (the hybrid layer) -----
X('bss', 'Bulgarian split squat', { c: 'extra', m: ['quads', 'glutes'], h: ['adductors', 'gmed'], j: ['knee', 'hip'], e: ['dumbbells', 'bench'], cal: true, rest: 180, min: 9, uni: true, note: 'kg per hand',
  cues: ['Rear foot on a bench, front shin near vertical', 'Back knee to just above the floor, 1 s pause', 'Drive through the front heel'] });
X('leg_press', 'Leg press', { c: 'extra', m: ['quads', 'glutes'], h: ['adductors'], j: ['knee', 'hip'], e: ['leg_press'], step: 10, cal: true, rest: 180, min: 8,
  cues: ['Feet shoulder width, mid-platform', 'Deep: knees toward your chest, hips stay down', 'No knee lockout at the top'] });
X('front_squat', 'Front squat', { c: 'extra', m: ['quads'], h: ['glutes', 'upback', 'abs'], j: ['knee', 'hip', 'wrist'], e: ['barbell', 'rack'], cal: true, rest: 240, min: 9,
  cues: ['Clean grip or crossed arms; elbows high', 'Sit straight down, 1 s pause', 'Stay upright; don\'t let the elbows drop'] });
X('trapbar_high', 'Trap bar deadlift (high handles)', { c: 'extra', m: ['quads', 'glutes'], h: ['hamstrings', 'lowback', 'upback', 'forearms'], j: ['knee', 'hip', 'lowback'], e: ['trap_bar'], step: 5, cal: true, rest: 240, min: 9,
  cues: ['Stand centred, grip the high handles', 'Hips lower than a deadlift, chest up', 'Dead stop on the floor every rep'] });
X('walking_lunge', 'Walking lunge', { c: 'extra', m: ['quads', 'glutes'], h: ['adductors', 'gmed'], j: ['knee', 'hip'], e: ['dumbbells'], cal: true, rest: 180, min: 9, uni: true, note: 'kg per hand',
  cues: ['Long steps; back knee kisses the floor', 'Torso tall', '4–8 steps per leg'] });
X('zercher', 'Zercher squat', { c: 'extra', m: ['quads'], h: ['glutes', 'upback', 'abs'], j: ['knee', 'hip', 'elbow', 'lowback'], e: ['barbell', 'rack'], cal: true, rest: 240, min: 9,
  cues: ['Bar in the crooks of the elbows, hugged tight', 'Squat between your knees, torso upright', 'Pad the bar with a towel if needed'],
  how: 'The bar sits in the crooks of your elbows, hugged to your body; squat between your knees.' });
X('rdl', 'Romanian deadlift', { c: 'extra', m: ['hamstrings'], h: ['glutes', 'lowback', 'forearms'], j: ['lowback', 'hip'], e: ['barbell'], cal: true, rest: 180, min: 9,
  cues: ['Soft knees, push the hips back', 'Bar slides down the thighs to mid-shin, flat back', 'Squeeze the glutes to stand'] });
X('good_morning', 'Good morning', { c: 'extra', m: ['hamstrings', 'lowback'], h: ['glutes'], j: ['lowback', 'hip'], e: ['barbell', 'rack'], cal: true, rest: 180, min: 8,
  cues: ['Bar on your upper back, soft knees', 'Hinge until your torso is near level', 'Flat back throughout'] });
X('rack_pull', 'Rack pull', { c: 'extra', m: ['lowback', 'upback'], h: ['hamstrings', 'glutes', 'forearms'], j: ['lowback', 'hip'], e: ['barbell', 'power_rack'], step: 5, cal: true, rest: 240, min: 9,
  cues: ['Pins just below your knees', 'Pull to lockout, squeeze the traps', 'Dead stop on the pins every rep'], how: 'Deadlift from rack pins set just below your knees.' });
X('deficit_pushup', 'Weighted deficit push-up', { c: 'extra', k: 'bwlift', m: ['chest'], h: ['triceps', 'fdelt'], j: ['shoulder', 'wrist', 'elbow'], e: ['plates'], step: 5, cal: { bw: true }, rest: 180, min: 7,
  cues: ['Hands on plates for extra depth', 'Plate on your back adds the load', 'Chest below your hands, 1 s pause'], how: 'Push-ups with hands on plates for extra depth and a plate on your back.' });
X('incline_bb', 'Incline barbell bench', { c: 'extra', m: ['chest'], h: ['fdelt', 'triceps'], j: ['shoulder', 'elbow', 'wrist'], e: ['barbell', 'bench', 'rack'], cal: true, rest: 240, min: 8,
  cues: ['Bench at 30–45°', 'Bar to the upper chest, 1 s pause', 'Shoulder blades pinned'] });
X('close_grip', 'Close-grip bench', { c: 'extra', m: ['triceps', 'chest'], h: ['fdelt'], j: ['shoulder', 'elbow', 'wrist'], e: ['barbell', 'bench', 'rack'], cal: true, rest: 240, min: 8,
  cues: ['Hands just inside shoulder width', 'Elbows tucked, bar to the lower chest', '1 s pause on the chest'] });
X('pin_press', 'Pin press', { c: 'extra', m: ['chest', 'triceps'], h: ['fdelt'], j: ['shoulder', 'elbow', 'wrist'], e: ['barbell', 'power_rack', 'bench'], cal: true, rest: 240, min: 8,
  cues: ['Pins 2–5 cm above your chest', 'Full dead stop on the pins', 'Press explosively but strictly'], how: 'Bench press from a dead stop on power-rack pins set 2–5 cm above your chest.' });
X('arnold', 'Arnold press', { c: 'extra', m: ['fdelt', 'sdelt'], h: ['triceps'], j: ['shoulder', 'elbow'], e: ['dumbbells', 'bench'], cal: true, rest: 180, min: 8, note: 'kg per hand',
  cues: ['Seated, palms facing you at chin height', 'Rotate to palms forward as you press', 'Reverse it slowly'], how: 'Seated dumbbell press that starts palms-in at chin height and rotates to palms-forward as you press.' });
X('pendlay', 'Pendlay row', { c: 'extra', m: ['upback', 'lats'], h: ['lowback', 'biceps'], j: ['lowback', 'shoulder', 'elbow'], e: ['barbell'], cal: true, rest: 180, min: 8,
  cues: ['Torso level with the floor', 'Explode the bar to your lower chest', 'Dead stop on the floor every rep'], how: 'Row from a dead stop on the floor every rep, torso parallel to it.' });
X('db_row', 'Single-arm dumbbell row', { c: 'extra', m: ['lats', 'upback'], h: ['biceps'], j: ['shoulder', 'elbow'], e: ['dumbbells', 'bench'], cal: true, rest: 150, min: 8, uni: true,
  cues: ['Staggered stance or hand on the bench', 'Pull the elbow to your hip', 'Full stretch at the bottom'] });
X('landmine', 'Half-kneeling landmine press', { c: 'extra', m: ['fdelt'], h: ['triceps', 'obliques'], j: ['shoulder', 'elbow'], e: ['landmine'], alt: 'hk_db_press', cal: true, rest: 150, min: 8, uni: true,
  cues: ['Kneel on the same side as the pressing arm', 'Press up and forward; ribs down', 'No twisting'] });
X('hk_db_press', 'Half-kneeling single-arm dumbbell press', { c: 'variant', m: ['fdelt'], h: ['triceps', 'obliques'], j: ['shoulder', 'elbow'], e: ['dumbbells'], cal: true, rest: 150, min: 8, uni: true,
  cues: ['Kneel on the same side as the pressing arm', 'Press straight up; ribs down', 'No leaning'] });
X('sumo_dl', 'Sumo deadlift', { c: 'extra', m: ['hamstrings', 'glutes', 'adductors'], h: ['quads', 'lowback', 'upback', 'forearms'], j: ['lowback', 'hip', 'knee'], e: ['barbell'], step: 5, cal: true, rest: 240, min: 9,
  cues: ['Wide stance, toes out, hands inside the knees', 'Push the knees out, chest up', 'Dead stop on the floor every rep'] });

// ----- Must-train area exercises -----
// Neck
X('neck_flex_plate', 'Plate neck flexion', { c: 'area', m: ['neck'], j: ['neck'], e: ['bench', 'plates'], cal: true, rest: 120, min: 5, iso: true,
  cues: ['Lie face-up, head off the end of the bench', 'Plate on your forehead over a folded towel', 'Chin to chest and back, slowly'], how: 'Lie face-up with your head off a bench and nod a towel-padded plate up and down.' });
X('neck_harness_ext', 'Neck harness extension', { c: 'area', m: ['neck'], h: ['upback'], j: ['neck'], e: ['neck_harness'], alt: 'neck_ext_plate', cal: true, rest: 120, min: 5, iso: true,
  cues: ['Hinge forward, hands on your thighs', 'Raise your head against the harness', 'Slow, no jerking'] });
X('neck_ext_plate', 'Plate neck extension', { c: 'variant', m: ['neck'], h: ['upback'], j: ['neck'], e: ['bench', 'plates'], cal: true, rest: 120, min: 5, iso: true,
  cues: ['Lie face-down, head off the end of the bench', 'Plate on the back of your head over a towel', 'Raise your head slowly; no jerking'], how: 'Lie face-down with your head off a bench and raise a towel-padded plate held on the back of your head.' });
X('neck_side_plate', 'Side-lying neck flexion with plate', { c: 'area', m: ['neck'], j: ['neck'], e: ['bench', 'plates'], cal: true, rest: 120, min: 5, iso: true, uni: true,
  cues: ['Lie on your side, head off the bench', 'Towel-padded plate on the side of your head', 'Ear toward your shoulder, slowly'], how: 'Lie on your side with your head off a bench and lift your ear toward your shoulder against a towel-padded plate.' });
X('neck_iso', 'Neck isometrics, 4 directions', { c: 'area', k: 'hold', m: ['neck'], j: ['neck'], rest: 60, min: 5,
  cues: ['Hand on your forehead, push hard without moving', 'Then the back, left and right sides', 'Log seconds per direction'], how: 'Press your head into your own hand in each direction without letting it move.' });
X('neck_partner', 'Partner manual neck resistance', { c: 'area', k: 'reps', m: ['neck'], j: ['neck'], e: ['partner'], rest: 90, min: 5,
  cues: ['Partner resists with a hand on your head', 'Move slowly through each direction', 'Smooth, no jerking'], how: 'A partner resists with a hand on your head while you move slowly through each direction.' });
// Lower back
X('ghd_back_ext', 'GHD back extension', { c: 'area', k: 'bwlift', m: ['lowback'], h: ['glutes', 'hamstrings'], j: ['lowback', 'hip'], e: ['ghd'], alt: 'back_ext_45', cal: { bw: true }, rest: 150, min: 5,
  cues: ['Hips on the pad', 'Round down, extend to a straight line', '1 s hold at the top'] });
X('back_ext_45', 'Weighted 45° back extension', { c: 'variant', k: 'bwlift', m: ['lowback'], h: ['glutes', 'hamstrings'], j: ['lowback', 'hip'], e: ['back_ext'], cal: { bw: true }, rest: 150, min: 5,
  cues: ['Hips just over the pad edge', 'Round down, extend to a straight line, 1 s hold', 'Hug a plate to your chest for load'] });
X('reverse_hyper', 'Reverse hyper (machine)', { c: 'area', m: ['lowback', 'glutes'], h: ['hamstrings'], j: ['lowback', 'hip'], e: ['ghd'], alt: 'reverse_hyper_bench', cal: true, rest: 150, min: 5,
  cues: ['Hips at the edge of the pad', 'Raise straight legs to hip height', 'Control the swing down'] });
X('reverse_hyper_bench', 'Reverse hyper off a high bench', { c: 'variant', k: 'bwlift', m: ['lowback', 'glutes'], h: ['hamstrings'], j: ['lowback', 'hip'], e: ['bench', 'dumbbells'], cal: { bw: true }, rest: 150, min: 5,
  cues: ['Hips at the edge of a high bench, hold on', 'Dumbbell squeezed between your feet', 'Raise straight legs to hip height, 1 s hold'], how: 'Lie face-down on a high bench with your hips at the edge, a dumbbell between your feet, and raise your straight legs.' });
X('back_ext_hold', 'Back-extension hold', { c: 'area', k: 'hold', m: ['lowback'], h: ['glutes', 'hamstrings'], j: ['lowback'], e: ['back_ext'], rest: 120, min: 5,
  cues: ['Body in a straight line on the 45° bench', 'Hug a plate when it gets easy', 'Hold to failure'] });
X('jefferson_curl', 'Jefferson curl', { c: 'area', m: ['lowback', 'hamstrings'], j: ['lowback'], e: ['kettlebells'], step: 4, cal: true, rest: 120, min: 5, minGap: 28,
  cues: ['Stand on a sturdy bench or box', 'Roll down one vertebra at a time over 5 s', 'Roll back up the same way; light weight'], how: 'Stand on a box with a light kettlebell and roll down one vertebra at a time over 5 s, then roll back up.' });
// Deep core
X('cable_crunch', 'Cable crunch', { c: 'area', m: ['abs'], h: ['obliques'], j: ['lowback'], e: ['cables'], step: 5, cal: true, rest: 120, min: 5, iso: true,
  cues: ['Kneel, rope beside your head', 'Curl your ribs to your hips; hips stay still', '1 s squeeze, 4 s up'] });
X('hanging_leg_raise', 'Hanging leg raise', { c: 'area', k: 'bwlift', m: ['abs', 'hipflex'], h: ['forearms'], j: ['shoulder', 'hip'], e: ['pullup_bar'], step: 1, cal: { bw: true }, rest: 120, min: 5,
  cues: ['Dead hang; no swing', 'Straight legs as high as you can, 1 s pause', 'Past 8 reps, squeeze a light dumbbell between your feet'] });
X('ab_rollout', 'Ab-wheel rollout', { c: 'area', k: 'reps', m: ['abs'], h: ['lats'], j: ['shoulder', 'lowback'], e: ['ab_wheel'], alt: 'barbell_rollout', rest: 120, min: 5,
  cues: ['From the knees; go standing when 8+ is easy', 'Roll out until your body is nearly flat', 'Ribs down; no sagging'] });
X('barbell_rollout', 'Barbell rollout', { c: 'variant', k: 'reps', m: ['abs'], h: ['lats'], j: ['shoulder', 'lowback'], e: ['barbell'], rest: 120, min: 5,
  cues: ['Round plates on the bar', 'Roll out from your knees until nearly flat', 'Ribs down; no sagging'], how: 'Kneel and roll a loaded barbell out and back like an ab wheel.' });
X('pallof', 'Pallof press with 3 s hold', { c: 'area', m: ['obliques', 'abs'], j: ['shoulder'], e: ['cables'], step: 5, cal: true, rest: 90, min: 5, uni: true,
  cues: ['Stand side-on to the cable', 'Press straight out from your chest', 'Hold 3 s resisting the twist'], how: 'Stand side-on to a cable, press the handle straight out, and hold 3 s without letting it twist you.' });
X('hollow_hold', 'Hollow-body hold', { c: 'area', k: 'hold', m: ['abs'], h: ['hipflex'], j: ['lowback'], rest: 90, min: 5,
  cues: ['Lower back pressed into the floor', 'Arms overhead, legs low', 'Hold to failure'] });
// Calves and soleus
X('seated_calf', 'Seated calf raise', { c: 'area', m: ['soleus'], h: ['calves'], j: ['ankle'], e: ['calf_machine'], alt: 'seated_calf_db', step: 5, cal: true, rest: 120, min: 5, iso: true,
  cues: ['2 s pause in the deep stretch', 'Rise as high as you can, 2 s squeeze', 'No bouncing'] });
X('seated_calf_db', 'Seated calf raise (dumbbells on knees)', { c: 'variant', m: ['soleus'], h: ['calves'], j: ['ankle'], e: ['dumbbells', 'bench'], cal: true, rest: 120, min: 5, iso: true,
  cues: ['Balls of your feet on a plate', 'Dumbbells on your knees', '2 s pause at the bottom and top'] });
X('standing_calf', 'Standing calf raise', { c: 'area', m: ['calves'], h: ['soleus'], j: ['ankle'], e: ['calf_machine'], alt: 'single_leg_calf', step: 5, cal: true, rest: 120, min: 5, iso: true,
  cues: ['Knees straight', '2 s pause in the deep stretch', 'Rise as high as you can, 2 s squeeze'] });
X('single_leg_calf', 'Single-leg calf raise on a step', { c: 'variant', m: ['calves'], h: ['soleus'], j: ['ankle'], e: ['dumbbells'], cal: true, rest: 120, min: 5, iso: true, uni: true,
  cues: ['Dumbbell in the same-side hand', '2 s pause at the bottom and top', 'Hold something for balance'] });
X('wall_sit_calf', 'Bent-knee wall-sit calf raise', { c: 'area', k: 'reps', m: ['soleus'], h: ['quads'], j: ['ankle', 'knee'], rest: 90, min: 5,
  cues: ['Hold a wall sit, thighs level', 'Raise and lower your heels', 'Full range, 1 s pauses'], how: 'Hold a wall sit and raise and lower your heels.' });
X('soleus_hold', 'Bent-knee soleus hold', { c: 'area', k: 'hold', m: ['soleus'], j: ['ankle', 'knee'], e: ['kettlebells'], rest: 90, min: 5,
  cues: ['Knees bent, heels as high as possible', 'Kettlebell held at your chest', 'Hold until your heels drop'], how: 'Knees bent, heels high, kettlebell at your chest: hold until your heels drop.' });
// Shins and feet
X('tib_bar_raise', 'Tib bar raise', { c: 'area', m: ['tib'], j: ['ankle'], e: ['tib_bar'], alt: 'cable_tib', cal: true, rest: 90, min: 5, iso: true,
  cues: ['Sit on a bench, tib bar over your feet', 'Pull your toes up to your shins', '1 s squeeze'] });
X('cable_tib', 'Cable tib raise', { c: 'variant', m: ['tib'], j: ['ankle'], e: ['cables', 'ankle_strap'], alt: 'kb_toe_raise', cal: true, rest: 90, min: 5, iso: true,
  cues: ['Sit facing a low pulley', 'Strap over the top of your foot', 'Pull your toes toward your shin, 1 s squeeze'], how: 'Sit facing a low pulley with the ankle strap over your foot and pull your toes up toward your shin.' });
X('kb_toe_raise', 'Kettlebell toe raise', { c: 'variant', m: ['tib'], j: ['ankle'], e: ['kettlebells', 'bench'], step: 4, cal: true, rest: 90, min: 5, iso: true,
  cues: ['Sit on a bench edge', 'Kettlebell handle hooked over your toes', 'Lift your toes toward your shin, 1 s squeeze'], how: 'Sit on a bench edge, hook a kettlebell over your toes, and lift your toes toward your shin.' });
X('db_tib_raise', 'Seated dumbbell tib raise', { c: 'area', m: ['tib'], j: ['ankle'], e: ['dumbbells', 'bench'], cal: true, rest: 90, min: 5, iso: true,
  cues: ['Dumbbell held vertically between your feet', 'Pull your toes up', '1 s squeeze'], how: 'Sit with a dumbbell held vertically between your feet and pull your toes up.' });
X('wall_tib', 'Wall tib raise', { c: 'area', k: 'reps', m: ['tib'], j: ['ankle'], rest: 90, min: 5,
  cues: ['Back against a wall, heels 30 cm out', 'Lift your toes as high as you can', 'Slow on the way down'], how: 'Lean your back on a wall with your heels a foot out and lift your toes repeatedly.' });
X('short_foot', 'Short-foot hold', { c: 'area', k: 'hold', m: ['tib'], j: ['ankle'], rest: 60, min: 5,
  cues: ['Lift the arch; toes stay flat and relaxed', 'Don\'t curl the toes', 'Hold each foot'], how: 'Shorten your foot by lifting the arch, toes flat and relaxed, and hold.' });
X('towel_scrunch', 'Weighted towel scrunch', { c: 'area', k: 'reps', m: ['tib'], j: ['ankle'], e: ['plates'], rest: 60, min: 5,
  cues: ['Small plate on the far end of a towel', 'Scrunch the towel toward you with your toes', 'Each foot'], how: 'Scrunch a towel toward you with your toes while a small plate weighs down its far end.' });
X('toe_sit', 'Toe-sit hold', { c: 'area', k: 'hold', m: ['tib'], j: ['ankle', 'knee'], rest: 60, min: 5,
  cues: ['Kneel with toes tucked under', 'Sit back on your heels', 'Hold; breathe'], how: 'Kneel with your toes tucked under and sit back on your heels.' });
// Grip and forearms
X('gripper', 'Gripper closes', { c: 'area', k: 'reps', m: ['forearms'], j: ['wrist'], e: ['grip_tools'], rest: 90, min: 5, uni: true,
  cues: ['Hardest gripper you can close 4–8 times', 'Full close: handles touch', 'Move up a gripper when both sets reach 8'] });
X('plate_pinch', 'Plate pinch hold', { c: 'area', k: 'hold', m: ['forearms'], j: ['wrist'], e: ['plates'], rest: 90, min: 5,
  cues: ['Two smooth plates, smooth sides out', 'Fingers and thumb only', 'Hold to failure'], how: 'Pinch two smooth plates together with your fingers and thumb, and hold.' });
X('towel_hang', 'Towel hang', { c: 'area', k: 'hold', m: ['forearms'], h: ['lats'], j: ['shoulder', 'wrist'], e: ['pullup_bar'], rest: 90, min: 5,
  cues: ['Two towels looped over the bar', 'Shoulders engaged', 'Hang to failure'], how: 'Hang from two towels looped over a pull-up bar.' });
X('farmers_carry', "Heavy farmer's carry", { c: 'area', k: 'carry', m: ['forearms', 'upback'], h: ['glutes', 'abs'], j: ['wrist', 'lowback'], e: ['dumbbells'], cal: true, rest: 120, min: 5, note: 'kg per hand',
  cues: ['Heavy dumbbells, tall posture', 'Short quick steps', 'Walk until your grip fails'] });
X('reverse_curl', 'Reverse curl', { c: 'area', m: ['forearms'], h: ['biceps'], j: ['elbow', 'wrist'], e: ['barbell'], cal: true, rest: 90, min: 5, iso: true,
  cues: ['Overhand grip', 'Elbows at your sides', '4 s down'] });
X('wrist_curl', 'Wrist curl + reverse wrist curl', { c: 'area', m: ['forearms'], j: ['wrist'], e: ['dumbbells'], step: 1, cal: true, rest: 90, min: 5, iso: true,
  cues: ['Forearms on your thighs or a bench', 'Full range at the wrist', 'One set each way'] });
X('kb_bottoms_up_hold', 'Kettlebell bottoms-up hold', { c: 'area', k: 'hold', m: ['forearms'], h: ['cuff'], j: ['wrist', 'shoulder'], e: ['kettlebells'], rest: 90, min: 5,
  cues: ['Kettlebell upside down, bell up', 'Crush the handle', 'Hold at shoulder height'], how: 'Hold a kettlebell upside down by the handle, bell pointing up, at shoulder height.' });
// Hip flexors and psoas
X('hanging_knee_raise', 'Hanging knee raise', { c: 'area', k: 'bwlift', m: ['hipflex'], h: ['abs'], j: ['shoulder', 'hip'], e: ['pullup_bar'], step: 1, cal: { bw: true }, rest: 120, min: 5,
  cues: ['Dead hang; no swing', 'Knees to chest, 1 s pause', 'Progress to straight legs'] });
X('cable_hip_flex', 'Cable hip flexion', { c: 'area', m: ['hipflex'], j: ['hip'], e: ['cables', 'ankle_strap'], alt: 'seated_slr', cal: true, rest: 90, min: 5, uni: true,
  cues: ['Ankle strap on a low pulley, face away', 'Drive the knee up and forward', '1 s hold at the top'], how: 'Ankle strap on a low pulley, face away, and drive your knee up and forward.' });
X('psoas_march', 'Lying psoas march', { c: 'area', m: ['hipflex'], h: ['abs'], j: ['hip'], e: ['cables', 'ankle_strap'], alt: 'psoas_march_hold', cal: true, rest: 90, min: 5, uni: true,
  cues: ['On your back, knees bent', 'Drive one knee to your chest against the cable', 'The other leg stays still'], how: 'On your back, knees bent, drive one knee to your chest against an ankle-strap cable while the other leg stays still.' });
X('psoas_march_hold', 'Psoas hold (hand resistance)', { c: 'variant', k: 'hold', m: ['hipflex'], h: ['abs'], j: ['hip'], rest: 60, min: 5,
  cues: ['On your back, one knee to your chest', 'Push the knee away with your hands; resist', 'Hold each side'], how: 'On your back, pull one knee toward your chest while your hands push it away, and hold.' });
X('l_sit', 'L-sit hold', { c: 'area', k: 'hold', m: ['hipflex', 'abs'], h: ['triceps'], j: ['shoulder', 'wrist', 'hip'], rest: 90, min: 5,
  cues: ['On dip bars, parallettes or the floor', 'Legs straight and level', 'Shoulders down'] });
X('seated_slr', 'Seated straight-leg raise', { c: 'area', k: 'reps', m: ['hipflex'], j: ['hip'], rest: 60, min: 5,
  cues: ['Sit tall, legs straight on the floor', 'Lift both heels a few cm', 'Hip flexors only; no leaning back'], how: 'Sit tall with straight legs and lift both heels a few cm using only your hip flexors.' });
// Shoulder stabilizers
X('face_pull', 'Face pull', { c: 'area', m: ['rdelt', 'cuff'], h: ['upback'], j: ['shoulder'], e: ['cables'], step: 5, cal: true, rest: 120, min: 5, iso: true,
  cues: ['Rope at face height', 'Pull to your forehead, thumbs back, elbows high', '1 s squeeze'] });
X('ext_rot', 'Cable external rotation (90/90)', { c: 'area', m: ['cuff'], j: ['shoulder'], e: ['cables'], cal: true, rest: 90, min: 5, iso: true, uni: true,
  cues: ['Upper arm level with your shoulder, elbow at 90°', 'Rotate the forearm up against the cable', 'Slow, no shrug'], how: 'Upper arm out at shoulder height, elbow at 90°: rotate your forearm up against the cable.' });
X('cuban_press', 'Cuban press', { c: 'area', m: ['cuff', 'rdelt'], h: ['sdelt'], j: ['shoulder'], e: ['dumbbells'], step: 1, cal: true, rest: 90, min: 5, iso: true,
  cues: ['Upright row to elbows at 90°', 'Rotate the forearms up, press overhead', 'Reverse it slowly'], how: 'Upright row to elbows at 90°, rotate your forearms up, press overhead, then reverse it.' });
X('scap_pullup', 'Scapular pull-ups', { c: 'area', k: 'reps', m: ['upback'], h: ['lats', 'cuff'], j: ['shoulder'], e: ['pullup_bar'], rest: 90, min: 5,
  cues: ['Straight arms, dead hang', 'Pull the shoulder blades down and back', 'Lift a few cm; 1 s hold'], how: 'Hang with straight arms and pull your shoulder blades down and back to lift yourself a few cm.' });
X('kb_bu_press', 'Kettlebell bottoms-up press', { c: 'area', m: ['cuff', 'fdelt'], h: ['forearms'], j: ['shoulder', 'wrist'], e: ['kettlebells'], step: 4, cal: true, rest: 120, min: 5, uni: true,
  cues: ['Kettlebell upside down, bell up', 'Crush the handle; press slowly', 'Don\'t let it tip'], how: 'Press a kettlebell overhead upside down, bell up, without letting it tip.' });
X('tgu', 'Turkish get-up', { c: 'area', m: ['cuff', 'abs'], h: ['glutes', 'obliques', 'fdelt'], j: ['shoulder', 'hip'], e: ['kettlebells'], step: 4, cal: true, rest: 120, min: 6, uni: true,
  cues: ['Arm locked, eyes on the bell', 'Step by step: elbow, hand, bridge, sweep, stand', 'Reverse every step on the way down'], how: 'Stand up from lying on your back with a kettlebell locked out overhead, then reverse it.' });
X('oh_kb_carry', 'Overhead kettlebell carry', { c: 'area', k: 'carry', m: ['cuff', 'fdelt'], h: ['abs', 'upback'], j: ['shoulder'], e: ['kettlebells'], step: 4, cal: true, rest: 120, min: 5,
  cues: ['Arm locked, biceps by your ear', 'Ribs down, walk tall', 'Walk until the arm or grip fails'] });
X('ring_support', 'Ring support hold', { c: 'area', k: 'hold', m: ['cuff', 'triceps'], h: ['chest'], j: ['shoulder', 'wrist'], e: ['rings'], alt: 'top_dip_hold', rest: 90, min: 5,
  cues: ['Arms locked at the top of a dip', 'Turn the rings out', 'Hold to failure'], how: 'Hold yourself at the top of a ring dip with arms locked and the rings turned out.' });
X('top_dip_hold', 'Top-of-dip hold', { c: 'variant', k: 'hold', m: ['triceps', 'cuff'], h: ['chest'], j: ['shoulder', 'wrist'], e: ['dip_station'], alt: 'top_dip_hold_machine', rest: 90, min: 5,
  cues: ['Arms locked at the top of a dip', 'Shoulders pushed down', 'Hold to failure'] });
X('top_dip_hold_machine', 'Top-of-dip hold (dip machine handles)', { c: 'variant', k: 'hold', m: ['triceps', 'cuff'], h: ['chest'], j: ['shoulder', 'wrist'], e: ['machines'], rest: 90, min: 5,
  cues: ['Zero assist; arms locked', 'Shoulders pushed down', 'Hold to failure'] });
// Adductors and glute medius
X('copenhagen', 'Copenhagen plank', { c: 'area', k: 'hold', m: ['adductors'], h: ['abs', 'obliques'], j: ['knee', 'hip'], e: ['bench'], rest: 90, min: 5, uni: true,
  cues: ['Top leg on a bench, bottom leg free', 'Short lever (knee on bench) first, then long lever (ankle)', 'Hips high, body in a straight line'], how: 'Side plank with your top leg on a bench and your bottom leg lifted.' });
X('adductor_machine', 'Adductor machine', { c: 'area', m: ['adductors'], j: ['hip'], e: ['abad_machine'], alt: 'cable_adduction', step: 5, cal: true, rest: 120, min: 5, iso: true,
  cues: ['Full stretch at the start', 'Squeeze the pads together, 1 s', '4 s back out'] });
X('cable_adduction', 'Cable adduction', { c: 'variant', m: ['adductors'], j: ['hip'], e: ['cables', 'ankle_strap'], alt: 'adduction_plate', cal: true, rest: 90, min: 5, iso: true, uni: true,
  cues: ['Strap on the inside leg, side-on to the pulley', 'Sweep the leg across your body', '1 s squeeze'] });
X('adduction_plate', 'Side-lying adduction with a plate', { c: 'variant', m: ['adductors'], j: ['hip'], e: ['plates'], cal: true, rest: 90, min: 5, iso: true, uni: true,
  cues: ['Lie on your side, top leg bent in front', 'Plate on the inside of the bottom leg', 'Raise the bottom leg, 1 s hold'], how: 'Lie on your side with your top leg bent in front and lift your straight bottom leg with a plate on it.' });
X('abductor_machine', 'Abductor machine', { c: 'area', m: ['gmed'], h: ['glutes'], j: ['hip'], e: ['abad_machine'], alt: 'cable_abduction', step: 5, cal: true, rest: 120, min: 5, iso: true,
  cues: ['Sit tall or lean slightly forward', 'Push out, 1 s squeeze', '4 s back in'] });
X('cable_abduction', 'Cable abduction', { c: 'variant', m: ['gmed'], h: ['glutes'], j: ['hip'], e: ['cables', 'ankle_strap'], alt: 'side_lying_abd', cal: true, rest: 90, min: 5, iso: true, uni: true,
  cues: ['Strap on the outside leg', 'Sweep the leg out to the side', '1 s squeeze'] });
X('side_lying_abd', 'Side-lying abduction with a plate', { c: 'variant', m: ['gmed'], j: ['hip'], e: ['plates'], cal: true, rest: 90, min: 5, iso: true, uni: true,
  cues: ['Lie on your side', 'Plate on the outside of the top thigh', 'Raise the straight top leg, 1 s hold'], how: 'Lie on your side with a plate on your top thigh and raise the straight top leg.' });
X('cossack', 'Cossack squat (kettlebell)', { c: 'area', m: ['adductors', 'quads'], h: ['glutes', 'gmed'], j: ['knee', 'hip', 'ankle'], e: ['kettlebells'], step: 4, cal: true, rest: 120, min: 5, uni: true,
  cues: ['Wide stance, kettlebell at your chest', 'Sink onto one leg, the other straight with toes up', 'Heel down; switch sides'], how: 'Wide stance: sink onto one leg with the other straight and toes up, then switch.' });
X('lateral_lunge', 'Lateral lunge', { c: 'area', m: ['adductors', 'glutes'], h: ['quads', 'gmed'], j: ['knee', 'hip'], e: ['dumbbells'], cal: true, rest: 120, min: 5, uni: true, note: 'kg per hand',
  cues: ['Step wide to the side', 'Sit back into the hip, other leg straight', 'Push back to the start'] });
X('sl_rdl', 'Single-leg RDL', { c: 'area', m: ['hamstrings', 'gmed'], h: ['glutes', 'lowback'], j: ['hip', 'lowback'], e: ['dumbbells'], cal: true, rest: 120, min: 5, uni: true,
  cues: ['Weight in the opposite hand', 'Hinge on one leg, hips square', 'Flat back; reach long'] });

// ---------------------------------------------------------------------------
// Anchor groups, staple slots and must-train areas
// ---------------------------------------------------------------------------
L.GROUPS = { A: ['squat', 'dips', 'chins'], B: ['bench', 'deadlift'], C: ['pullups', 'military'] };
L.GROUP_NAMES = { A: 'Squat · Dips · Chin-ups', B: 'Bench · Deadlift', C: 'Pull-ups · Military press' };
L.SEED = { A: 0, C: 2, B: 4 };              // week-1 order: A day 1, C day 3, B day 5
L.SPACING = [['squat', 'deadlift', 'squatDL'], ['pullups', 'chins', 'pullChin'], ['bench', 'dips', 'press'], ['bench', 'military', 'press'], ['dips', 'military', 'press']];

// items: exercise id → ideal gap in days (the most overdue wins the slot); {gap, blocks} limits it to blocks
L.POOLS = {
  A: [
    { slot: 'Quads', items: { leg_ext: 12, bss: 45, leg_press: 45, front_squat: 63, trapbar_high: 63, walking_lunge: { gap: 45, blocks: [4] }, zercher: { gap: 63, blocks: [4] } } },
    { slot: 'Hamstrings', items: { leg_curl: 12, rdl: 45, good_morning: 90, rack_pull: 90, sumo_dl: { gap: 45, blocks: [4] } }, skipBlocks: [3] }
  ],
  B: [
    { slot: 'Chest', items: { incline_db: 10, pec_fly: 30, deficit_pushup: 63, incline_bb: 90, close_grip: 90, pin_press: 90 } },
    { slot: 'Triceps', items: { oh_tri: 18, pushdown_bar: 36, pushdown_rope: 36 } },
    { slot: 'Biceps', items: { bench_curl: 18, hammer: 18 } },
    { slot: 'Side delts', items: { lateral: 10, arnold: 63 }, skipBlocks: [2] }
  ],
  C: [
    { slot: 'Row 1', items: { tbar: 10, pendlay: 63 } },
    { slot: 'Row 2', items: { seated_row: 10, db_row: 63 } },
    { slot: 'Lats', items: { pulldown: 12, pullover: 30 } },
    { slot: 'Rear delts', items: { rear_delt: 10, landmine: 63 }, skipBlocks: [2] }
  ]
};

L.AREAS = {
  neck: { name: 'Neck', ideal: 4, main: ['neck'], pool: ['neck_flex_plate', 'neck_harness_ext', 'neck_side_plate', 'neck_iso', 'neck_partner'] },
  lowback: { name: 'Lower back', ideal: 5.5, main: ['lowback'], pool: ['ghd_back_ext', 'reverse_hyper', 'back_ext_hold', 'jefferson_curl'] },
  core: { name: 'Deep core', ideal: 4, main: ['abs'], pool: ['cable_crunch', 'hanging_leg_raise', 'ab_rollout', 'pallof', 'hollow_hold'] },
  calves: { name: 'Calves & soleus', ideal: 5, main: ['soleus', 'calves'], pool: ['seated_calf', 'standing_calf', 'wall_sit_calf', 'soleus_hold'] },
  shins: { name: 'Shins & feet', ideal: 5, main: ['tib'], pool: ['tib_bar_raise', 'db_tib_raise', 'wall_tib', 'short_foot', 'towel_scrunch', 'toe_sit'] },
  grip: { name: 'Grip & forearms', ideal: 4, main: ['forearms'], pool: ['gripper', 'plate_pinch', 'towel_hang', 'farmers_carry', 'reverse_curl', 'wrist_curl', 'kb_bottoms_up_hold'] },
  hipflex: { name: 'Hip flexors & psoas', ideal: 5, main: ['hipflex'], pool: ['hanging_knee_raise', 'cable_hip_flex', 'psoas_march', 'l_sit', 'seated_slr'] },
  stabilizers: { name: 'Shoulder stabilizers', ideal: 4.5, main: ['cuff'], pool: ['face_pull', 'ext_rot', 'cuban_press', 'scap_pullup', 'kb_bu_press', 'tgu', 'oh_kb_carry', 'ring_support'] },
  adductors: { name: 'Adductors & glute med', ideal: 5, main: ['adductors', 'gmed'], pool: ['copenhagen', 'adductor_machine', 'abductor_machine', 'cossack', 'lateral_lunge', 'sl_rdl'] }
};
// What else counts as work for an area
L.COVERS = {
  Soviet: ['neck', 'core', 'grip', 'hipflex'], Fascia: ['adductors', 'stabilizers', 'calves', 'shins'], Track: ['hipflex', 'neck'],
  deadlift: ['lowback', 'grip'], rdl: ['lowback'], good_morning: ['lowback'], rack_pull: ['lowback', 'grip'], sumo_dl: ['lowback', 'grip'], trapbar_high: ['grip']
};

// ---------------------------------------------------------------------------
// Session templates: the fatigue each session adds (before protection and the 50% skip rule)
// ---------------------------------------------------------------------------
L.TEMPLATE_LOAD = {
  Soviet: { quads: 20, glutes: 15, hamstrings: 12, chest: 15, triceps: 15, fdelt: 12, lats: 12, abs: 25, obliques: 15, hipflex: 20, neck: 30, lowback: 12, upback: 10, calves: 15, adductors: 10, impact: 20, forearms: 20 },
  Fascia: { calves: 20, soleus: 20, tib: 20, impact: 15, abs: 12, obliques: 15, adductors: 20, gmed: 20, hamstrings: 12, glutes: 12, lowback: 8, cuff: 20, upback: 8, forearms: 8, sdelt: 8, lats: 6 },
  TrackLegs: { hamstrings: 15, glutes: 10, calves: 12, hipflex: 15, quads: 5, impact: 20 },
  TrackGPP: { abs: 25, obliques: 15, chest: 20, triceps: 20, fdelt: 12, neck: 20 }
};

// ----- Soviet "Borets" day -----
L.SOVIET = {
  warmup: ['Jog or skip 3 min', 'Joint rotations: neck, shoulders, hips, knees, ankles', 'Forward and backward rolls ×5 each', 'Cartwheel drill ×4 each side', 'Neck circles on all fours ×10 each way', 'Bridge prep: rock gently in a hands-supported bridge'],
  bridges: [
    { id: 'bridge_hands', name: 'Hands-supported back bridge', how: 'Back bridge with hands and head on the mat; rock forward and back.' },
    { id: 'bridge_wrestler', name: "Wrestler's back bridge", how: 'Bridge on your head and feet, arms crossed on your chest; rock until your nose nears the mat and back.' },
    { id: 'bridge_circles', name: 'Back-bridge circles', how: 'In a back bridge, roll around on your head in circles, both ways.' },
    { id: 'bridge_front', name: 'Front bridge', how: 'Face-down on your forehead and feet, hands behind your back; rock and circle.' },
    { id: 'bridge_turnover', name: 'Bridge turnovers', how: 'Walk around from a front bridge to a back bridge and back, both directions.' },
    { id: 'bridge_loaded', name: 'Loaded bridge rocks', how: "Wrestler's bridge rocks with a light plate held on your chest." }
  ],
  stations: [
    { id: 'sprawl_burpee', name: 'Sprawl burpee', m: ['chest', 'quads', 'abs', 'impact'] },
    { id: 'hindu_pushup', name: 'Hindu push-up (dand)', m: ['chest', 'triceps', 'fdelt'], press: true, how: 'Dive from a downward dog through a low swoop into an upward dog, then push back.' },
    { id: 'hindu_squat', name: 'Hindu squat (baithak)', m: ['quads', 'calves'], how: 'Fast bodyweight squat onto the balls of your feet with arms swinging back and forward.' },
    { id: 'jump_squat', name: 'Jump squat', m: ['quads', 'glutes', 'calves', 'impact'] },
    { id: 'broad_jump', name: 'Broad jump', m: ['quads', 'glutes', 'hamstrings', 'impact'] },
    { id: 'tech_standup', name: 'Technical stand-up', m: ['quads', 'abs'], how: 'From sitting, post one hand and the opposite foot, lift your hips and step back to standing.' },
    { id: 'pen_step', name: 'Penetration step into sprawl', m: ['quads', 'glutes', 'chest', 'impact'], how: 'Drop-step onto your knee as if shooting a takedown, recover, then sprawl.' },
    { id: 'shadow_wrestling', name: 'Shadow wrestling', m: ['quads', 'abs', 'neck'], how: 'Move in your stance, drilling shots, sprawls and stand-ups against an imaginary opponent.' },
    { id: 'pushup_wide', name: 'Wide push-up', m: ['chest', 'fdelt'], press: true },
    { id: 'pushup_close', name: 'Close push-up', m: ['triceps', 'chest'], press: true },
    { id: 'pushup_clap', name: 'Clap push-up', m: ['chest', 'triceps', 'impact'], press: true },
    { id: 'pullups_reps', name: 'Pull-ups for reps', m: ['lats', 'biceps'], e: ['pullup_bar'], pull: true },
    { id: 'towel_pullups', name: 'Towel pull-ups', m: ['lats', 'forearms', 'biceps'], e: ['pullup_bar'], pull: true, how: 'Pull-ups gripping two towels looped over the bar.' },
    { id: 'rope_climb', name: 'Rope climb', m: ['lats', 'forearms', 'biceps'], e: ['climbing_rope'], pull: true },
    { id: 'handstand_hold', name: 'Handstand hold (wall)', m: ['fdelt', 'triceps'], unit: 's', press: true },
    { id: 'wall_walk', name: 'Wall walk', m: ['fdelt', 'triceps', 'abs'], press: true, how: "From a push-up with your feet at a wall, walk your feet up and hands in until you're near vertical, then back." },
    { id: 'wrestler_situp', name: "Wrestler's sit-up with twist", m: ['abs', 'obliques'] },
    { id: 'vup', name: 'V-up', m: ['abs', 'hipflex'] },
    { id: 'lying_leg_raise', name: 'Lying leg raise', m: ['abs', 'hipflex'] },
    { id: 'shrimping', name: 'Shrimping (hip escapes)', m: ['obliques', 'abs', 'glutes'], how: 'On your back, push off one foot and drive your hips sideways along the floor, alternating sides.' },
    { id: 'bear_crawl', name: 'Bear crawl', m: ['fdelt', 'quads', 'abs'] },
    { id: 'crab_walk', name: 'Crab walk', m: ['triceps', 'glutes'] },
    { id: 'duck_walk', name: 'Duck walk', m: ['quads', 'glutes'], how: 'Walk in a deep squat without standing up.' },
    { id: 'frog_jump', name: 'Frog jump', m: ['quads', 'glutes', 'calves', 'impact'], how: 'Jump forward from a deep squat and land back in it.' },
    { id: 'croc_crawl', name: 'Low crocodile crawl', m: ['chest', 'triceps', 'abs'], press: true, how: 'Crawl with your chest a few cm off the floor, elbows bent like the bottom of a push-up.' },
    { id: 'rolls', name: 'Forward and backward rolls', m: ['abs', 'neck'] },
    { id: 'cartwheel', name: 'Cartwheels', m: ['fdelt', 'obliques'] },
    { id: 'headstand_hold', name: 'Headstand hold', m: ['neck', 'abs'], unit: 's' },
    { id: 'kb_swing', name: 'Kettlebell swing', m: ['hamstrings', 'glutes', 'lowback'], e: ['kettlebells'] },
    { id: 'kb_snatch', name: 'Kettlebell snatch', m: ['hamstrings', 'glutes', 'fdelt'], e: ['kettlebells'] },
    { id: 'kb_long_cycle', name: 'Kettlebell long-cycle clean and jerk', m: ['quads', 'glutes', 'fdelt', 'triceps'], e: ['kettlebells'], press: true, how: 'Clean the kettlebell to the rack, jerk it overhead, drop it between your legs, and repeat.' },
    { id: 'kb_getup', name: 'Turkish get-up', m: ['cuff', 'abs', 'glutes'], e: ['kettlebells'] },
    { id: 'fireman_carry', name: "Fireman's carry walk", m: ['quads', 'glutes', 'upback', 'neck'], e: ['partner'] },
    { id: 'piggyback_squat', name: 'Piggyback squats', m: ['quads', 'glutes'], e: ['partner'] },
    { id: 'wheelbarrow', name: 'Wheelbarrow walk', m: ['chest', 'triceps', 'fdelt'], e: ['partner'], press: true },
    { id: 'hand_fighting', name: 'Hand-fighting rounds', m: ['forearms', 'fdelt', 'neck'], e: ['partner'] },
    { id: 'bearhug_lift', name: 'Bear-hug lifts', m: ['lowback', 'glutes', 'biceps'], e: ['partner'] }
  ],
  intervals: [
    { id: 'match_periods', name: 'Match periods', desc: '3 × 3 min, 1 min rest. Each minute: 20 s all-out shots, sprawls and stand-ups, then 40 s hard shadow wrestling.', unit: 'all-out reps', timer: { rounds: 9, work: 20, rest: 40, setRest: 60, setEvery: 3 }, m: ['quads', 'abs', 'chest', 'impact'] },
    { id: 'short_match', name: 'Short match', desc: '2 × 3 min with a 30 s break, continuous drilling: shots, sprawls, stand-ups.', unit: 'reps', timer: { rounds: 2, work: 180, rest: 30 }, m: ['quads', 'abs', 'impact'] },
    { id: 'tabata_sprawls', name: 'Tabata sprawls', desc: '2 rounds of 8 × 20 s on, 10 s off, 2 min between rounds.', unit: 'sprawls', timer: { rounds: 16, work: 20, rest: 10, setRest: 120, setEvery: 8 }, m: ['chest', 'quads', 'abs', 'impact'] },
    { id: 'shuttles', name: 'Shuttle sprints', desc: '10 × 40 m (20 m and back), 20 s rest.', unit: 'shuttles', timer: { rounds: 10, work: 10, rest: 20 }, m: ['hamstrings', 'quads', 'calves', 'impact'] },
    { id: 'swing_emom', name: 'Kettlebell swing EMOM', desc: '12 min: 15–25 swings at the top of every minute.', unit: 'swings', e: ['kettlebells'], timer: { rounds: 12, work: 60, rest: 0 }, m: ['hamstrings', 'glutes', 'lowback'] },
    { id: 'burpee_ladder', name: 'Burpee ladder', desc: '1 burpee, rest 10 s, 2 burpees, rest 10 s … up to 10. Log your time.', unit: 'seconds (lower is better)', lowerBetter: true, m: ['chest', 'quads', 'impact'] }
  ],
  burnout: ['hanging_leg_raise', 'towel_hang']
};

// ----- Fascia "Elastic" day -----
// k: reps (contacts or reps per burst/set), lift (2 × 4–8), hold, list (checklist only)
L.FASCIA = {
  bounceIn: ['Pogo hops 2 × 30 s', 'Skipping 2 min (rope if you have one)', 'Loose arm swings 1 min', 'Torso whips 1 min'],
  sections: [
    { id: 'elastic', name: 'Elastic and bouncing', min: 10, pick: 2, drills: [
      { id: 'pogo', name: 'Pogo hops', k: 'reps', unit: 'contacts', m: ['calves', 'impact'], cue: '20–40 s bursts, quiet soft landings' },
      { id: 'cm_jump', name: 'Counter-movement squat jumps', k: 'reps', m: ['quads', 'glutes', 'impact'], cue: 'Dip and explode; stick the landing' },
      { id: 'bounding', name: 'Bounding', k: 'reps', unit: 'bounds', m: ['quads', 'glutes', 'hamstrings', 'impact'], cue: 'Long, springy strides' },
      { id: 'drop_pop', name: 'Drop-and-pop push-ups', k: 'reps', m: ['chest', 'triceps'], cue: 'Drop into a push-up and pop straight back up' },
      { id: 'kb_swings_el', name: 'Kettlebell swings', k: 'reps', m: ['hamstrings', 'glutes'], e: ['kettlebells'], cue: 'Snap the hips; let the bell float' },
      { id: 'wall_rebound', name: 'Wall rebounds', k: 'reps', niche: true, m: ['chest', 'triceps'], cue: 'Fall into a wall, spring straight off it', how: 'Fall forward into a wall from a step back and spring off with your hands.' },
      { id: 'skater', name: 'Lateral skater rebounds', k: 'reps', niche: true, m: ['gmed', 'adductors', 'impact'], cue: 'Side to side, stick and rebound' },
      { id: 'rot_hops', name: '90° rotational hops', k: 'reps', niche: true, m: ['calves', 'obliques', 'impact'], cue: 'Quarter turn each hop, quiet landings' },
      { id: 'sl_pogo', name: 'Single-leg pogos', k: 'reps', niche: true, unit: 'contacts', m: ['calves', 'soleus', 'impact'], cue: 'Stiff ankle, quick contacts' },
      { id: 'trap_jump', name: 'Trap bar jumps', k: 'reps', blocks: [3], m: ['quads', 'glutes', 'impact'], e: ['trap_bar'], cue: '2 × 5 max-height jumps at 20–30% of your trap bar deadlift; land soft' }
    ] },
    { id: 'spiral', name: 'Spiral and torsion', min: 12, pick: 2, drills: [
      { id: 'torso_whips', name: 'Loose-arm torso whips', k: 'reps', m: ['obliques'], cue: '30 s bursts, arms like ropes' },
      { id: 'woodchop_hl', name: 'Cable woodchop, high to low', k: 'lift', m: ['obliques', 'abs'], e: ['cables'], uni: true, cue: 'Rotate through the hips, not just the arms' },
      { id: 'woodchop_lh', name: 'Cable woodchop, low to high', k: 'lift', m: ['obliques', 'abs'], e: ['cables'], uni: true, cue: 'Drive from the back foot' },
      { id: 'spiral_lunge', name: 'Spiral lunge with reach', k: 'lift', m: ['quads', 'obliques', 'glutes'], e: ['dumbbells'], uni: true, cue: 'Lunge and reach across the front knee' },
      { id: 'kb_windmill', name: 'Kettlebell windmill', k: 'lift', m: ['obliques', 'cuff', 'hamstrings'], e: ['kettlebells'], uni: true, cue: 'Eyes on the bell, hinge sideways' },
      { id: 'hk_spiral', name: 'Half-kneeling spiral reach', k: 'lift', niche: true, m: ['obliques', 'hipflex'], e: ['kettlebells'], uni: true, cue: 'Reach up and across; feel the spiral line' },
      { id: 'cross_reach', name: 'Cross-body overhead reach walk', k: 'reps', niche: true, m: ['obliques', 'lats'], cue: 'Each step, reach the opposite arm high and across' },
      { id: 'lizard', name: 'Lizard crawl', k: 'reps', niche: true, unit: 'metres', m: ['chest', 'hipflex', 'obliques'], cue: 'Low, long, opposite arm and leg', how: 'Crawl low with your opposite knee driving up to your elbow each step.' }
    ] },
    { id: 'slings', name: 'Lines and slings', min: 18, pick: 3, drills: [
      { id: 'tgu', ex: 'tgu', name: 'Turkish get-up (spiral line)', k: 'lift', m: ['cuff', 'abs', 'glutes'], e: ['kettlebells'], uni: true },
      { id: 'sl_rdl_contra', name: 'Single-leg RDL, opposite-hand kettlebell (deep longitudinal sling)', k: 'lift', m: ['hamstrings', 'gmed', 'glutes'], e: ['kettlebells'], uni: true, cue: 'Hips square, reach long' },
      { id: 'split_row', name: 'Split-stance single-arm cable row (posterior oblique sling)', k: 'lift', m: ['lats', 'upback', 'glutes'], e: ['cables'], uni: true, cue: 'Opposite leg forward; rotate as you row' },
      { id: 'pallof_rot', name: 'Pallof press with rotation (anterior oblique sling)', k: 'lift', m: ['obliques', 'abs'], e: ['cables'], uni: true, cue: 'Press out, rotate away, return slowly' },
      { id: 'suitcase', name: 'Suitcase carry (lateral sling)', k: 'carry', m: ['obliques', 'forearms', 'gmed'], e: ['dumbbells'], cue: 'One heavy dumbbell; walk tall without leaning' },
      { id: 'copenhagen', ex: 'copenhagen', name: 'Copenhagen plank (lateral sling)', k: 'hold', m: ['adductors', 'obliques'], e: ['bench'], uni: true },
      { id: 'cossack', ex: 'cossack', name: 'Cossack squat (lateral line)', k: 'lift', m: ['adductors', 'quads'], e: ['kettlebells'], uni: true },
      { id: 'kb_side_bend', name: 'Kettlebell side bend (lateral line)', k: 'lift', m: ['obliques'], e: ['kettlebells'], uni: true, cue: 'Bend straight sideways, slow' },
      { id: 'jefferson', ex: 'jefferson_curl', name: 'Jefferson curl (back line)', k: 'lift', niche: true, m: ['lowback', 'hamstrings'], e: ['kettlebells'] },
      { id: 'backbend', name: 'Tall-kneeling back bend with reach (front line)', k: 'hold', niche: true, m: ['abs', 'hipflex'], cue: 'Squeeze the glutes, reach up and back', how: 'Kneel tall, squeeze your glutes and reach up and back into a gentle back bend.' },
      { id: 'psoas_lunge', name: 'Psoas lunge with overhead reach (deep front line)', k: 'hold', niche: true, m: ['hipflex'], uni: true, cue: 'Tuck the pelvis, reach tall' },
      { id: 'one_arm_hang', name: 'One-arm dead hang with slow body turns (arm lines)', k: 'hold', niche: true, m: ['forearms', 'lats', 'cuff'], e: ['pullup_bar'], uni: true, cue: 'Turn slowly left and right while hanging' },
      { id: 'bear_crab', name: 'Bear and crab crawls (arm lines)', k: 'reps', niche: true, unit: 'metres', m: ['fdelt', 'triceps', 'quads'], cue: 'Alternate 10 m bear, 10 m crab' }
    ] },
    { id: 'lowerleg', name: 'Lower-leg springs', min: 8, pick: 2, drills: [
      { id: 'soleus_hold', ex: 'soleus_hold', name: 'Bent-knee soleus hold', k: 'hold', m: ['soleus'], e: ['kettlebells'] },
      { id: 'sl_pogo2', name: 'Single-leg pogos', k: 'reps', unit: 'contacts', m: ['calves', 'soleus', 'impact'], cue: 'Stiff ankle, quick contacts' },
      { id: 'tib_raise', ex: 'tib_bar_raise', name: 'Tib raise', k: 'lift', m: ['tib'] },
      { id: 'short_foot', ex: 'short_foot', name: 'Short-foot hold', k: 'hold', m: ['tib'] },
      { id: 'toe_sit', ex: 'toe_sit', name: 'Toe-sit hold', k: 'hold', niche: true, m: ['tib'] },
      { id: 'towel_scrunch', ex: 'towel_scrunch', name: 'Weighted towel scrunch', k: 'reps', niche: true, m: ['tib'] },
      { id: 'heel_drop', name: 'Heel-drop rebounds off a step', k: 'reps', niche: true, m: ['calves', 'soleus'], cue: 'Drop the heels, rebound up quickly' }
    ] }
  ],
  swing: { name: 'Swing finisher: swing, figure-8 and halo complex, every minute on the minute', min: 12, unit: 'reps', e: ['kettlebells'], timer: { rounds: 12, work: 60, rest: 0 } },
  stretches: ['Forward fold: melt 10 s, then small end-range bounces 20 s', 'Side reach, each side', 'Lunge reach, each side', 'Overhead reach', 'Niche: bounce in the bottom of a deep squat', 'Niche: adductor rock-backs'],
  maneuvers: ['Slow counter-rotation twists with deep breaths, 2–3 min, then walk 1–3 min', '"Pin and lock": grip skin or fingers, then twist slowly, 2–3 min, then walk', 'Finger-tug torso twists, 2–3 min, then walk', 'Slow head and neck wrings, 2–3 min, then walk', 'Lying leg and hip counter-rotations, 2–3 min, then walk']
};

// ----- Track day -----
L.TRACK = {
  warmup: ['Jog 5 min', 'A skips 2 × 20 m', 'B skips 2 × 20 m', 'Leg swings, front and side, ×10 each', '3 build-up strides to 90%'],
  speed: [
    { id: 'accel', name: 'Accelerations', desc: '6–8 × 20–30 m from a 3-point or falling start. Walk back + 90 s.', target: 6, max: 10, unit: 'reps' },
    { id: 'flying', name: 'Flying sprints', desc: '4–6 × 20 m at top speed after a 20–30 m build-up. 3 min rest.', target: 4, max: 6, unit: 'reps' },
    { id: 'maxv', name: 'Max-velocity runs', desc: '3–5 × 60 m. 4 min rest.', target: 3, max: 5, unit: 'reps' }
  ],
  repeat: {
    1: [{ id: 'rep30', name: 'Repeat sprints', desc: 'One set of 6 × 30 m, 20 s between reps.', target: 6, max: 10, unit: 'reps' }],
    2: [{ id: 'sprint_sprawl', name: 'Sprint-sprawls', desc: '8–10 × sprint 20 m, sprawl, sprint back. 30 s rest.', target: 8, max: 10, unit: 'reps' }],
    3: [{ id: 'rep30x3', name: 'Repeat sprints', desc: '2–3 sets of 6 × 30–40 m, 20 s between reps, 3–4 min between sets.', target: 12, max: 18, unit: 'reps' },
        { id: 'r150', name: '150 m repeats', desc: '4–6 × 150 m, 3–4 min rest.', target: 4, max: 6, unit: 'reps' }],
    4: [{ id: 'rep30', name: 'Repeat sprints', desc: 'One set of 6 × 30 m, 20 s between reps.', target: 6, max: 10, unit: 'reps' }]
  },
  field: ['pushup_wide', 'pushup_close', 'bear_crawl', 'wrestler_situp', 'vup', 'crab_walk', 'sprawl_burpee', 'lying_leg_raise', 'croc_crawl', 'headstand_hold'],
  cooldown: ['Walk 5 min']
};

// ----- Strength finishers -----
L.FINISHERS = {
  soviet: [
    { id: 'swing_emom', name: 'Kettlebell swing EMOM', desc: '15–25 swings at the top of every minute.', unit: 'swings', e: ['kettlebells'], load: { hamstrings: 15, glutes: 15, lowback: 8, forearms: 10 }, timer: { work: 60, rest: 0 } },
    { id: 'tabata_sprawls', name: 'Tabata sprawls', desc: '8 × 20 s on, 10 s off; 2 min; repeat.', unit: 'sprawls', load: { chest: 8, triceps: 6, quads: 10, abs: 10, hipflex: 8, impact: 10 }, timer: { work: 20, rest: 10, setRest: 120, setEvery: 8 } },
    { id: 'match_periods', name: 'Match periods', desc: '3-min periods, 1 min rest: each minute 20 s all-out shots, sprawls and stand-ups, 40 s shadow wrestling.', unit: 'all-out reps', load: { quads: 10, glutes: 8, hamstrings: 6, abs: 10, neck: 6, impact: 10, chest: 6 }, timer: { work: 20, rest: 40, setRest: 60, setEvery: 3 } },
    { id: 'burpee_ladder', name: 'Burpee ladder', desc: '1 to 10 burpees, 10 s rest between rungs; repeat down if time remains.', unit: 'burpees', load: { chest: 8, triceps: 6, quads: 8, abs: 6, impact: 10 } },
    { id: 'bridge_neck', name: 'Bridge and neck block', desc: "Wrestler's bridge rocks, circles and holds; neck isometrics.", unit: 'reps', load: { neck: 20, upback: 6 } }
  ],
  jumps: [
    { id: 'bounds_jumps', name: 'Bounds and jumps', desc: '5 rounds: 5 broad jumps + 20 m bounding, walk back.', unit: 'jumps', load: { quads: 8, glutes: 8, calves: 10, impact: 15 } }
  ]
};

// ---------------------------------------------------------------------------
// Sports: points per 60 min at intensity 10
// ---------------------------------------------------------------------------
L.SPORTS = {
  soccer: { name: 'Soccer', load: { hamstrings: 40, adductors: 35, hipflex: 35, quads: 30, calves: 30, glutes: 25, impact: 35, lowback: 10 } },
  basketball: { name: 'Basketball', load: { impact: 45, calves: 40, quads: 30, glutes: 25, hamstrings: 20, adductors: 15, sdelt: 10 } },
  handball: { name: 'Handball', load: { impact: 40, calves: 35, fdelt: 30, cuff: 30, quads: 25, adductors: 20, obliques: 20, triceps: 15 } },
  badminton: { name: 'Badminton', load: { forearms: 35, calves: 35, cuff: 30, sdelt: 30, impact: 25, quads: 20, adductors: 15, obliques: 15 } },
  squash: { name: 'Squash', load: { forearms: 35, calves: 35, quads: 30, cuff: 30, glutes: 25, adductors: 25, impact: 25, obliques: 20, lowback: 15 } },
  tennis: { name: 'Tennis', load: { forearms: 35, calves: 30, cuff: 30, obliques: 25, impact: 25, quads: 20 } },
  volleyball: { name: 'Volleyball', load: { impact: 45, calves: 35, cuff: 30, quads: 25, sdelt: 25 } },
  cricket: { name: 'Cricket', load: { lowback: 25, obliques: 25, cuff: 25, quads: 20, hamstrings: 20 } },
  kabaddi: { name: 'Kabaddi', load: { adductors: 35, quads: 30, impact: 30, neck: 25, forearms: 25, hamstrings: 25, lowback: 20 } },
  tabletennis: { name: 'Table tennis', load: { forearms: 25, calves: 20, obliques: 15 } },
  running: { name: 'Running', load: { calves: 30, soleus: 25, hamstrings: 25, quads: 25, impact: 35, hipflex: 20, glutes: 20 } },
  cycling: { name: 'Cycling', load: { quads: 35, glutes: 20, calves: 15, hipflex: 15, hamstrings: 10 } },
  swimming: { name: 'Swimming', load: { lats: 30, upback: 20, triceps: 20, cuff: 20, sdelt: 20, abs: 15, chest: 15, fdelt: 15 } },
  hiking: { name: 'Hiking', load: { calves: 25, quads: 25, glutes: 20, soleus: 20, hamstrings: 15, impact: 15 } },
  other: { name: 'Other (pick body parts)', load: {} }
};

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------
L.BLOCKS = {
  1: { name: 'Heavy Duty Foundation', emphasis: 'Strength', ideal: { Soviet: 7, Fascia: 9, Track: 12 }, prio: ['Soviet', 'Fascia', 'Track'], finishers: ['walk', 'walk', 'soviet'] },
  2: { name: 'Soviet Engine', emphasis: 'Wrestling conditioning', ideal: { Soviet: 4, Fascia: 12, Track: 14 }, prio: ['Soviet', 'Fascia', 'Track'], finishers: ['soviet', 'soviet', 'walk'], neckIdeal: 3 },
  3: { name: 'Elastic Athlete', emphasis: 'Fascia, sprints, jumps', ideal: { Soviet: 10, Fascia: 5, Track: 6 }, prio: ['Fascia', 'Track', 'Soviet'], finishers: ['walk', 'walk', 'jumps'] },
  4: { name: 'Hybrid Exhaustion', emphasis: 'Extra compounds, complete exhaustion', ideal: { Soviet: 8, Fascia: 10, Track: 14 }, prio: ['Soviet', 'Fascia', 'Track'], finishers: ['soviet', 'walk'], extrasFactor: 0.3, staplesFactor: 2.5, finisherMax: 25 }
};

// ---------------------------------------------------------------------------
// Default settings (every number in the training-system doc)
// ---------------------------------------------------------------------------
L.DEFAULTS = {
  repLow: 4, repHigh: 8, finishBoth: false, finishSet2: true, beatReps: 2,
  tempo: '4-1-2',
  rest: { big: 300, anchor: 240, staple: 180, iso: 150, small: 120 },
  steps: { big: 5, barbell: 2.5, dumbbell: 2.5, machine: 5, belt: 2.5 },
  gap: { anchorStart: 7, anchorFloor: 4, bigFloor: 5, anchorCeil: 12, bigCeil: 14, stapleStart: 6, stapleFloor: 4, stapleCeil: 21, areaStart: 2, areaFloor: 2, areaCeil: 10 },
  beatsToShrink: 3, missAdd: 1, missAdd2: 3,
  ready: { main: 30, help: 50, addon: 35, cond: 50, sprintHam: 35, sprintOther: 45 },
  hl: { big: 48, med: 36, small: 24 },
  load: { main: 15, help: 5, minor: 2, finish: 5, holdMain: 8, holdHelp: 4 },
  cost: { strength2: 35, strength3: 40, Soviet: 40, Track: 35, Fascia: 25, game: 30 },
  drain: 0.35, restLine: 60, restLineClustered: 55, maxStreak: 4,
  protectDays: 2, lookahead: 2,
  spacing: { squatDL: 3, pullChin: 2, press: 2 },
  sessionMax: 90, sessionMin: 75, fillRatio: 0.5, staplesUntil: 70, addonsUntil: 75,
  slots: { A: 2, B: 4, C: 4 }, addons: { A: 2, B: 1, C: 2 },
  typeMinGap: 3, trackMinGap: 7, overdueFactor: 1.5,
  walk: { start: 15, max: 20, speed: 5.4, speedMax: 6.0, speedStep: 0.2, incline: 14, inclineMax: 15 },
  blockMinWeeks: 4, blockMaxWeeks: 6, weekOffDays: 7,
  blockOrder: [1, 2, 3, 4],
  checkin: false, theme: 'dark', sound: true
};

L.SETTINGS_HELP = {
  repLow: 'Lowest reps that count as a working set.', repHigh: 'When both sets reach this, the weight goes up next time.',
  finishSet2: 'Set 2 continues past failure: 1–2 spotter-assisted reps, then one slow negative.', finishBoth: 'Both sets go past failure (needs more rest).',
  beatReps: 'Total extra reps (both sets) that count as a Beat. +1 counts as an Edge.',
  'rest.big': 'Seconds between working sets: squat and deadlift.', 'rest.anchor': 'Seconds between working sets: other anchors.',
  'rest.staple': 'Seconds between working sets: staples and extra compounds.', 'rest.iso': 'Seconds: isolation lifts.', 'rest.small': 'Seconds: small areas and holds.',
  'gap.anchorStart': 'Days each anchor rests at minimum when you start.', 'gap.anchorFloor': 'Shortest gap an anchor can reach.',
  'gap.bigFloor': 'Shortest gap for squat and deadlift.', 'gap.anchorCeil': 'Longest gap for an anchor.', 'gap.bigCeil': 'Longest gap for squat and deadlift.',
  'gap.stapleStart': 'Minimum days between sessions of the same staple.', beatsToShrink: 'Beats in a row before a gap shrinks by a day.',
  missAdd: 'Days added to the gap after a miss (on top of the days it actually had).', missAdd2: 'Days added after a 2nd miss in a row.',
  'ready.main': 'Main muscles must be at or under this for anchors and staples.', 'ready.help': 'Helper muscles must be at or under this.',
  'ready.addon': 'An area add-on needs its main muscle at or under this.', 'ready.cond': 'Conditioning skips any muscle above this.',
  'ready.sprintHam': 'Hamstrings must be at or under this to sprint.', 'ready.sprintOther': 'Calves, glutes, quads and impact must be at or under this to sprint.',
  'hl.big': 'Hours for big muscles to lose half their fatigue.', 'hl.med': 'Hours for medium muscles.', 'hl.small': 'Hours for small muscles.',
  'load.main': 'Fatigue each working set adds to its main muscles.', 'load.help': 'Fatigue each working set adds to helper muscles.',
  'load.minor': 'Fatigue each working set adds to minor muscles.', 'load.finish': 'Extra fatigue from the past-failure finish.',
  'cost.strength2': 'Whole-body cost: Strength with 2 anchors.', 'cost.strength3': 'Whole-body cost: Strength with 3 anchors.',
  'cost.Soviet': 'Whole-body cost: Soviet day.', 'cost.Track': 'Whole-body cost: Track day.', 'cost.Fascia': 'Whole-body cost: Fascia day.',
  'cost.game': 'Whole-body cost of a 60-min game at intensity 10.', drain: 'Share of the whole-body meter that drains each day (0.35 = 35%).',
  restLine: 'Wake up at or above this and it is a rest day.', restLineClustered: 'Rest line for 2 weeks after 2 anchors miss within 7 days.',
  maxStreak: 'Most training days in a row (games count).', protectDays: 'Days before an anchor when other work must keep it ready.',
  lookahead: 'Days the planner checks before choosing a non-strength session.',
  'spacing.squatDL': 'Days between squat and deadlift.', 'spacing.pullChin': 'Days between pull-ups and chin-ups.', 'spacing.press': 'Days between bench, dips and military press.',
  sessionMax: 'Hard cap on session length (minutes).', sessionMin: 'Sessions shorter than this get one extra add-on that is nearly due, if one is ready.',
  fillRatio: 'How due an area must be to top up a short session (1 = fully due, 0.5 = halfway).', staplesUntil: 'Staples fit until this minute mark.', addonsUntil: 'Add-ons fit until this minute mark.',
  'slots.A': 'Staple slots in group A sessions.', 'slots.B': 'Staple slots in group B sessions.', 'slots.C': 'Staple slots in group C sessions.',
  'addons.A': 'Must-train add-ons in group A sessions.', 'addons.B': 'Add-ons in group B sessions.', 'addons.C': 'Add-ons in group C sessions.',
  typeMinGap: 'Soviet and Fascia days never repeat within this many days.', trackMinGap: 'Track days never repeat within this many days.',
  overdueFactor: 'A Soviet, Fascia or Track session this many times past its ideal gap can go before strength.',
  'walk.start': 'Incline walk start (minutes).', 'walk.max': 'Incline walk length cap (minutes).', 'walk.speed': 'Start speed (km/h).',
  'walk.speedMax': 'Top speed before incline goes up (km/h).', 'walk.incline': 'Start incline.', 'walk.inclineMax': 'Top incline before intervals.',
  blockOrder: 'Order the blocks run in, repeating.', blockMinWeeks: 'Earliest week a block can end in a week off.', blockMaxWeeks: 'Latest week a block ends in a week off.', weekOffDays: 'Length of the week off (days).'
};

G.NM_LIB = L;
})(typeof window !== 'undefined' ? window : globalThis);
