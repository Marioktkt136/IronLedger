import {
  AnatomyMuscleId,
  ExerciseDefinition,
  ExerciseGuideRecord,
  LanguageCode,
  MuscleGroup,
  RecommendedMachineGuide,
} from './models';

export interface AnatomyMuscleMeta {
  id: AnatomyMuscleId;
  category: MuscleGroup;
  view: 'front' | 'back' | 'both';
  nameEn: string;
  nameAr: string;
  roleEn: string;
  roleAr: string;
  defaultMachinesEn: RecommendedMachineGuide[];
  defaultMachinesAr: RecommendedMachineGuide[];
  howToTargetEn: string[];
  howToTargetAr: string[];
}

export const ANATOMY_MUSCLES: Record<AnatomyMuscleId, AnatomyMuscleMeta> = {
  upper_chest: {
    id: 'upper_chest',
    category: 'chest',
    view: 'front',
    nameEn: 'Upper Chest (Clavicular Pecs)',
    nameAr: 'أعلى الصدر (التَرْقُوي)',
    roleEn: 'Shoulder flexion and pressing upward along an incline angle.',
    roleAr: 'رفع الذراع للأمام ودفع الأوزان بزاوية مائلة للأعلى.',
    defaultMachinesEn: [
      {
        machineName: 'Incline Chest Press Machine (Plate-Loaded / Converging)',
        setupCue: 'Set seat so handles align with upper collarbone / upper sternum; 30°–45° incline.',
        targetBenefit: 'Tracks natural converging arc for maximum upper-pectoral fiber tension.',
      },
      {
        machineName: 'Low-to-High Cable Fly Station',
        setupCue: 'Set both pulleys to lowest notch; step one foot forward and press up toward chin level.',
        targetBenefit: 'Maintains continuous tension along the upward clavicular fiber angle.',
      },
    ],
    defaultMachinesAr: [
      {
        machineName: 'جهاز ضغط الصدر المائل للأعلى (Converging)',
        setupCue: 'اضبط المقعد بحيث توازي المقابض أعلى الصدر تحت الترقوة بزاوية ٣٠–٤٥ درجة.',
        targetBenefit: 'يوفر مساراً متقارباً يركّز الشد على ألياف الصدر العلوية بأمان.',
      },
      {
        machineName: 'جهاز الكابل من أسفل لأعلى',
        setupCue: 'ثبّت البكرتين في أدنى مستوى وتقدّم خطوة للأمام مع رفع الذراعين بمستوى الذقن.',
        targetBenefit: 'يحافظ على توتر مستمر طوال المدى الحركي لأعلى الصدر.',
      },
    ],
    howToTargetEn: [
      'Retract shoulder blades gently into the backrest before starting.',
      'Keep elbows tucked 30–45° below shoulder height to avoid front-delt takeover.',
      'Control a 2-second eccentric down to upper-chest level without bouncing.',
      'Press up and slightly inward toward center without locking out aggressively.',
    ],
    howToTargetAr: [
      'ثبّت لوحي الكتف للخلف والأسفل على مسند الظهر قبل بدء الدفع.',
      'وجّه المرفقين بزاوية ٣٠–٤٥ درجة للداخل لتقليل حمل الكتف الأمامي.',
      'انزل ببطء (ثانيتان) حتى مستوى أعلى الصدر مع تحكم كامل.',
      'ادفع للأعلى وللداخل نحو منتصف الصدر دون قفل المرفق بعنف.',
    ],
  },
  mid_chest: {
    id: 'mid_chest',
    category: 'chest',
    view: 'front',
    nameEn: 'Mid & Lower Chest (Sternal Pecs)',
    nameAr: 'منتصف وأسفل الصدر',
    roleEn: 'Horizontal adduction bringing the upper arm across the sternum.',
    roleAr: 'تقريب الذراعين أفقياً نحو منتصف الصدر.',
    defaultMachinesEn: [
      {
        machineName: 'Seated Chest Press Machine',
        setupCue: 'Adjust seat height so handles align horizontally with mid-nipple line.',
        targetBenefit: 'Stabilizes spine so pure sternal chest force can be loaded safely.',
      },
      {
        machineName: 'Pec Deck / Machine Chest Fly',
        setupCue: 'Align handles shoulder-level; sit upright with soft elbow bend (15°).',
        targetBenefit: 'Isolates horizontal adduction with peak squeeze at full contraction.',
      },
    ],
    defaultMachinesAr: [
      {
        machineName: 'جهاز ضغط الصدر جالساً (Chest Press)',
        setupCue: 'اضبط ارتفاع المقعد لتكون المقابض بمحاذاة منتصف الصدر تماماً.',
        targetBenefit: 'يثبت الجذع ويسمح بتركيز أقصى قوة على ألياف منتصف الصدر.',
      },
      {
        machineName: 'جهاز الفراشة للصدر (Pec Deck)',
        setupCue: 'اضبط المقابض بمستوى الكتف مع ثني طفيف ثابت في المرفقين (١٥ درجة).',
        targetBenefit: 'يعزل حركة ضم الذراعين مع ذروة انقباض قوية عند التقاء اليدين.',
      },
    ],
    howToTargetEn: [
      'Plant feet firmly flat on the floor and keep chest lifted through every rep.',
      'Move elbows toward each other rather than merely straightening hands.',
      'Pause 1 second at full chest stretch before initiating press or fly.',
    ],
    howToTargetAr: [
      'ثبّت قدميك بقوة على الأرض وارفع القفص الصدري طوال التمرين.',
      'ركّز على تقريب المرفقين معاً وليس مجرد فرد اليدين.',
      'توقف ثانية عند أقصى إطالة للصدر قبل بدء الدفع أو الضم.',
    ],
  },
  anterior_delts: {
    id: 'anterior_delts',
    category: 'shoulders',
    view: 'front',
    nameEn: 'Anterior Deltoids (Front Shoulders)',
    nameAr: 'الكتف الأمامي',
    roleEn: 'Raises arms forward and assists overhead & incline pressing.',
    roleAr: 'رفع الذراع للأمام والمساعدة في الدفع العلوي والمائل.',
    defaultMachinesEn: [
      {
        machineName: 'Machine Overhead Shoulder Press',
        setupCue: 'Align hands slightly forward in the scapular plane (15°–20° forward of ears).',
        targetBenefit: 'Tracks shoulder joint safely while hammering anterior deltoids.',
      },
      {
        machineName: 'Cable Front Raise (Single-Arm or Rope)',
        setupCue: 'Low pulley behind you, raise straight arm to eye level smoothly.',
        targetBenefit: 'Provides constant bottom-position tension absent in dumbbells.',
      },
    ],
    defaultMachinesAr: [
      {
        machineName: 'جهاز ضغط الأكتاف العلوي (Shoulder Press)',
        setupCue: 'اختر المقابض المحاذية لمستوى الكتف مع إمالة المرفقين للأمام قليلاً.',
        targetBenefit: 'يحمي مفصل الكتف مع استهداف مباشر للكتف الأمامي.',
      },
      {
        machineName: 'الرفرفة الأمامية بالكابل المنخفض',
        setupCue: 'البكرة خلف الجسم، ارفع الذراع للأمام حتى مستوى العينين بتحكم.',
        targetBenefit: 'يحافظ على الشد منذ بداية الحركة دون فقدان التوتر في الأسفل.',
      },
    ],
    howToTargetEn: [
      'Brace abs so lower back stays flush against the seat pad.',
      'Avoid shrugging traps upward at top of the press.',
    ],
    howToTargetAr: [
      'شد عضلات البطن لإبقاء أسفل الظهر ملتصقاً بالمسند.',
      'تجنّب رفع الترابيس نحو الأذنين في أعلى الحركة.',
    ],
  },
  lateral_delts: {
    id: 'lateral_delts',
    category: 'shoulders',
    view: 'both',
    nameEn: 'Lateral Deltoids (Side Shoulders)',
    nameAr: 'الكتف الجانبي',
    roleEn: 'Abducts arms outward to create upper-body width.',
    roleAr: 'رفع الذراعين للجانب لإبراز عرض الأكتاف.',
    defaultMachinesEn: [
      {
        machineName: 'Seated Lateral Raise Machine',
        setupCue: 'Align elbow axis with machine pivot cam; rest outer forearms on pads.',
        targetBenefit: 'Eliminates momentum and keeps constant torque across the side delt arc.',
      },
      {
        machineName: 'Cable Lateral Raise (Wrist Cuff / Handle)',
        setupCue: 'Set pulley to wrist/hip height; lean slightly away and sweep arm 30° forward.',
        targetBenefit: 'Loads side delts maximally in the lengthened half of the rep.',
      },
    ],
    defaultMachinesAr: [
      {
        machineName: 'جهاز الرفرفة الجانبية جالساً',
        setupCue: 'طابق مفصل المرفق مع محور دوران الجهاز واضغط الساعدين على الوسادات.',
        targetBenefit: 'يمنع المرجحة ويحافظ على توتر ثابت طوال قوس الحركة.',
      },
      {
        machineName: 'الرفرفة الجانبية بالكابل',
        setupCue: 'البكرة بمستوى الرسغ أو الورك؛ مِل قليلاً بعيداً عن الكابل وارفع للجانب ٣٠ درجة للأمام.',
        targetBenefit: 'يركّز الحمل في مرحلة الإطالة التي تعزز بناء الكتف الجانبي.',
      },
    ],
    howToTargetEn: [
      'Push hands outward toward the walls rather than upward.',
      'Stop around shoulder height to prevent upper trap takeover.',
    ],
    howToTargetAr: [
      'ادفع اليدين للخارج نحو الجدران بدلاً من رفعهما للأعلى فقط.',
      'توقّف عند مستوى الكتف لتجنب تدخل عضلات الترابيس.',
    ],
  },
  posterior_delts: {
    id: 'posterior_delts',
    category: 'shoulders',
    view: 'back',
    nameEn: 'Posterior Deltoids (Rear Shoulders)',
    nameAr: 'الكتف الخلفي',
    roleEn: 'Horizontal abduction & external shoulder rotation for posture and shoulder health.',
    roleAr: 'سحب الذراع للخلف وتدوير الكتف خارجياً لدعم استقامة القوام وصحة المفصل.',
    defaultMachinesEn: [
      {
        machineName: 'Reverse Pec Deck (Rear Delt Fly Machine)',
        setupCue: 'Sit facing pad; adjust handles back; use neutral palms-in or pronated grip.',
        targetBenefit: 'Pure rear-delt isolation without lower-back fatigue.',
      },
      {
        machineName: 'High Cable Face Pull (Rope)',
        setupCue: 'Pulley at forehead height; pull toward ears while externally rotating thumbs back.',
        targetBenefit: 'Targets rear delts alongside rotator cuff & mid-traps.',
      },
    ],
    defaultMachinesAr: [
      {
        machineName: 'جهاز الفراشة المعكوس (Reverse Pec Deck)',
        setupCue: 'اجلس مواجهاً للمسند واضبط المقابض للخلف مع مد الذراعين بمستوى الكتف.',
        targetBenefit: 'عزل نقي للكتف الخلفي دون إجهاد أسفل الظهر.',
      },
      {
        machineName: 'سحب الحبل للوجه بالكابل العالي (Face Pull)',
        setupCue: 'البكرة بمستوى الجبهة، اسحب نحو الأذنين مع لف الإبهامين للخلف.',
        targetBenefit: 'يقوي الكتف الخلفي مع الكفة المدورة وأوسط الظهر.',
      },
    ],
    howToTargetEn: [
      'Sweep arms wide in an arc instead of pinching shoulder blades together first.',
      'Control the return without letting weights slam.',
    ],
    howToTargetAr: [
      'وسّع قوس الذراعين للخارج بدلاً من عصر لوحي الكتف من البداية.',
      'تحكم بالعودة ببطء للحفاظ على التوتر في الكتف الخلفي.',
    ],
  },
  biceps: {
    id: 'biceps',
    category: 'arms',
    view: 'front',
    nameEn: 'Biceps Brachii & Brachialis',
    nameAr: 'البايسبس (العضلة ذات الرأسين)',
    roleEn: 'Elbow flexion and forearm supination.',
    roleAr: 'ثني مفصل المرفق وتدوير الساعد للخارج.',
    defaultMachinesEn: [
      {
        machineName: 'Preacher Curl Machine',
        setupCue: 'Set seat so triceps rest flat on sloped pad and elbows align with machine pivot.',
        targetBenefit: 'Locks upper arm to prevent torso swinging and peak-loads flexed biceps.',
      },
      {
        machineName: 'Seated Bayonet / Behind-Torso Cable Curl',
        setupCue: 'Low cable behind body; keep elbow pinned behind torso and curl cleanly.',
        targetBenefit: 'Maximizes stretch on the long head of the biceps.',
      },
    ],
    defaultMachinesAr: [
      {
        machineName: 'جهاز لاري كيرل (Preacher Curl Machine)',
        setupCue: 'اضبط المقعد بحيث تستقر الذراع الخلفية على المسند المائل ويحاذي المرفق محور الدوران.',
        targetBenefit: 'يمنع تمايل الجذع ويركّز المقاومة على البايسبس.',
      },
      {
        machineName: 'تمرين البايسبس بالكابل من خلف الجذع',
        setupCue: 'البكرة المنخفضة خلف الجسم؛ ثبّت المرفق للخلف واثنِ الساعد للأعلى.',
        targetBenefit: 'يطيل الرأس الطويل للبايسبس بأقصى كفاءة.',
      },
    ],
    howToTargetEn: [
      'Keep elbows glued in position without drifting forward at top.',
      'Lower all the way to near-full extension with control on every rep.',
    ],
    howToTargetAr: [
      'حافظ على ثبات المرفقين بجانب الجسم دون رفعهما للأمام.',
      'افرد الذراع تقريباً في الأسفل ببطء لتحفيز الإطالة الكاملة.',
    ],
  },
  triceps: {
    id: 'triceps',
    category: 'arms',
    view: 'back',
    nameEn: 'Triceps Brachii (Long, Lateral & Medial Heads)',
    nameAr: 'الترايسبس (العضلة ثلاثية الرؤوس)',
    roleEn: 'Elbow extension; overhead extension stretches the long head.',
    roleAr: 'مد مفصل المرفق؛ التمديد العلوي يطيل الرأس الطويل بعمق.',
    defaultMachinesEn: [
      {
        machineName: 'Seated Dip / Triceps Pressdown Machine',
        setupCue: 'Keep torso upright, elbows tucked tight to ribs, and press hands straight down.',
        targetBenefit: 'Heavy mechanical load across all three tricep heads.',
      },
      {
        machineName: 'Cable Rope Overhead Extension & Pushdown',
        setupCue: 'Pin upper arms; spread rope ends at full elbow lockout.',
        targetBenefit: 'Pairs long-head stretch (overhead) with peak medial/lateral contraction.',
      },
    ],
    defaultMachinesAr: [
      {
        machineName: 'جهاز المتوازي / دفع الترايسبس جالساً',
        setupCue: 'اجلس بظهر مستقيم ومرفقين قريبين من الجذع وادفع للأسفل حتى فرد المرفق.',
        targetBenefit: 'يتيح تحميل وزن ثقيل على رؤوس الترايسبس الثلاثة.',
      },
      {
        machineName: 'كابل الحبل (دفع للأسفل وتمديد علوي)',
        setupCue: 'ثبّت العضدين وافتح طرفي الحبل عند فرد المرفق بالكامل.',
        targetBenefit: 'يستهدف الرأس الطويل في الوضع العلوي والرأسين الجانبي والإنسي بالدفع.',
      },
    ],
    howToTargetEn: [
      'Lock upper arm position so only the forearm pivots at the elbow.',
      'Pause briefly at full lockout to squeeze the triceps.',
    ],
    howToTargetAr: [
      'ثبّت الجزء العلوي من الذراع بحيث يتحرك الساعد فقط حول المرفق.',
      'توقف للحظة عند الفرد الكامل لعصر عضلة الترايسبس.',
    ],
  },
  forearms: {
    id: 'forearms',
    category: 'arms',
    view: 'both',
    nameEn: 'Forearms & Grip Flexors/Extensors',
    nameAr: 'الساعد وقوة القبضة',
    roleEn: 'Wrist stabilization, grip strength, and brachioradialis elbow flexion.',
    roleAr: 'تثبيت الرسغ وقوة القبضة وثني المرفق بالقبضة المحايدة.',
    defaultMachinesEn: [
      {
        machineName: 'Cable Hammer Curl (Rope) / Wrist Roller Station',
        setupCue: 'Use neutral thumb-up grip on rope or rest forearms flat across bench knee edge.',
        targetBenefit: 'Targets brachioradialis and forearm flexors/extensors evenly.',
      },
    ],
    defaultMachinesAr: [
      {
        machineName: 'كابل همر كيرل بالحبل أو لف الرسغ',
        setupCue: 'امسك الحبل بقبضة محايدة (الإبهام للأعلى) أو أسند الساعدين على حافة البنش.',
        targetBenefit: 'يقوّي عضلة الساعد والقبضة بفاعلية.',
      },
    ],
    howToTargetEn: ['Use full wrist flexion/extension range without jerking shoulders.'],
    howToTargetAr: ['حرّك مفصل الرسغ في كامل مداه دون إشراك الكتفين.'],
  },
  traps: {
    id: 'traps',
    category: 'back',
    view: 'back',
    nameEn: 'Trapezius (Upper & Mid Traps)',
    nameAr: 'الترابيس (العلوية والمتوسطة)',
    roleEn: 'Elevates and retracts shoulder blades for neck/upper-back stability.',
    roleAr: 'رفع وسحب لوحي الكتف للخلف لتقوية أعلى الظهر والرقبة.',
    defaultMachinesEn: [
      {
        machineName: 'Standing / Plate-Loaded Shrug Machine',
        setupCue: 'Stand tall inside handles, brace core, shrug shoulders up & slightly back.',
        targetBenefit: 'Heavy linear resistance without bar-thigh friction.',
      },
    ],
    defaultMachinesAr: [
      {
        machineName: 'جهاز الشراجز (Shrug Machine)',
        setupCue: 'قف باستقامة وارفع الكتفين للأعلى وللخلف قليلاً مع ثبات الرقبة.',
        targetBenefit: 'تحميل آمن ومباشر على الترابيس دون احتكاك البار بالجسم.',
      },
    ],
    howToTargetEn: ['Pause 1–2 seconds at peak shrug height; never roll shoulders in circles.'],
    howToTargetAr: ['اثبت ثانية في أعلى نقطة ولا تُدر الكتفين بشكل دائري.'],
  },
  lats: {
    id: 'lats',
    category: 'back',
    view: 'back',
    nameEn: 'Latissimus Dorsi (Lats)',
    nameAr: 'المجنص / عضلات الظهر العريضة (Lats)',
    roleEn: 'Vertical pulling and shoulder extension driving elbows toward hips.',
    roleAr: 'السحب العمودي وسحب المرفقين للأسفل ونحو الوركين لزيادة عرض الظهر.',
    defaultMachinesEn: [
      {
        machineName: 'Plate-Loaded Iso-Lateral High Row / Lat Pulldown Machine',
        setupCue: 'Lock thighs snugly under knee pad; pull elbows down toward front hip pockets.',
        targetBenefit: 'Tracks natural iliac/thoracic lat line with independent arm paths.',
      },
      {
        machineName: 'Cable Lat Pulldown (MAG / Neutral Grip)',
        setupCue: 'Lean torso back only 10°; drive chest upward toward bar/attachment.',
        targetBenefit: 'Allows tailored grip width to bias upper or lower lats.',
      },
    ],
    defaultMachinesAr: [
      {
        machineName: 'جهاز السحب العالي الأحادي أو جهاز اللات (Iso-Lateral High Row)',
        setupCue: 'ثبّت الفخذين أسفل وسادة الركبة واسحب المرفقين نحو مستوى الوركين.',
        targetBenefit: 'يتبع مسار ألياف المجنص بدقة مع عزل متوازن لكل جانب.',
      },
      {
        machineName: 'جهاز السحب العلوي بالكابل (Lat Pulldown)',
        setupCue: 'أمل الجذع للخلف ١٠ درجات فقط وارفع صدرك نحو المقبض عند السحب.',
        targetBenefit: 'يمنح مدى حركة كامل من الإطالة العلوية حتى الانقباض.',
      },
    ],
    howToTargetEn: [
      'Think of your hands as hooks—pull through your elbows, not your biceps.',
      'Let shoulder blades elevate slightly at the top for full lat stretch.',
    ],
    howToTargetAr: [
      'تعامل مع يديك كخطافين واسحب بالمرفقين وليس بالبايسبس.',
      'اسمح للوحي الكتف بالارتفاع قليلاً في الأعلى لإطالة كاملة للمجنص.',
    ],
  },
  mid_back: {
    id: 'mid_back',
    category: 'back',
    view: 'back',
    nameEn: 'Mid-Back (Rhomboids & Mid-Traps)',
    nameAr: 'منتصف الظهر (المعينية وأوسط الترابيس)',
    roleEn: 'Horizontal rowing & scapular retraction for back thickness.',
    roleAr: 'السحب الأفقي وضم لوحي الكتف لزيادة سماكة منتصف الظهر.',
    defaultMachinesEn: [
      {
        machineName: 'Chest-Supported T-Bar / Seated Row Machine',
        setupCue: 'Set chest pad so arms extend fully forward without rounding lumbar; use wide pronated grip.',
        targetBenefit: 'Removes lower-back strain and isolates scapular retraction cleanly.',
      },
      {
        machineName: 'Seated Cable Row (Wide Handle)',
        setupCue: 'Keep torso upright with soft knee bend; pull handle toward lower ribs/sternum.',
        targetBenefit: 'Delivers continuous horizontal resistance through full scapular glide.',
      },
    ],
    defaultMachinesAr: [
      {
        machineName: 'جهاز السحب الجالس بدعم الصدر (Chest-Supported Row)',
        setupCue: 'اضبط مسند الصدر لتمديد الذراعين بالكامل للأمام واستخدم قبضة عريضة.',
        targetBenefit: 'يزيل الحمل عن أسفل الظهر ويركّز على سماكة منتصف الظهر.',
      },
      {
        machineName: 'جهاز السحب الأفقي بالكابل',
        setupCue: 'حافظ على استقامة الجذع واسحب المقبض نحو أسفل الصدر مع ضم لوحي الكتف.',
        targetBenefit: 'شد أفقي مستمر يعزز انقباض العضلات المعينية وأوسط الظهر.',
      },
    ],
    howToTargetEn: [
      'Protract shoulder blades forward at start, then pinch back smoothly on every pull.',
    ],
    howToTargetAr: [
      'اسمح للوحي الكتف بالتمدد للأمام في البداية ثم اجمعهما للخلف في نهاية السحب.',
    ],
  },
  lower_back: {
    id: 'lower_back',
    category: 'back',
    view: 'back',
    nameEn: 'Lower Back (Erector Spinae)',
    nameAr: 'أسفل الظهر (العضلات الناصبة للعمود الفقري)',
    roleEn: 'Spinal extension and anti-flexion stability during hip hinges.',
    roleAr: 'بسط العمود الفقري وتثبيت الجذع أثناء تمارين الرفع والانحناء.',
    defaultMachinesEn: [
      {
        machineName: '45° Back Extension Bench / Lower-Back Machine',
        setupCue: 'Set upper hip pad just below hip crease so pelvis hinges freely.',
        targetBenefit: 'Loads spinal erectors safely in controlled flexion/neutral extension.',
      },
    ],
    defaultMachinesAr: [
      {
        machineName: 'جهاز تمديد أسفل الظهر (45° Back Extension)',
        setupCue: 'اضبط الوسادة أسفل مفصل الورك مباشرة للسماح بثني الحوض بحرية.',
        targetBenefit: 'يقوّي عضلات أسفل الظهر بأمان وبمدى حركي منضبط.',
      },
    ],
    howToTargetEn: ['Stop at neutral straight-body alignment—avoid hyperextending the lumbar spine.'],
    howToTargetAr: ['توقّف عند استقامة الجسم المحايدة ولا تبالغ في تقويس أسفل الظهر.'],
  },
  abs: {
    id: 'abs',
    category: 'core',
    view: 'front',
    nameEn: 'Abdominals (Rectus Abdominis)',
    nameAr: 'عضلات البطن الأمامية',
    roleEn: 'Spinal flexion and pelvic tucking / anti-extension core bracing.',
    roleAr: 'ثني الجذع ورفع الحوض وتثبيت الجذع ضد التقوّس.',
    defaultMachinesEn: [
      {
        machineName: 'Seated Ab Crunch Machine / Captain’s Chair Leg Raise',
        setupCue: 'Align lower ribs with pivot axis; curl ribcage toward pelvis rather than pulling with arms.',
        targetBenefit: 'Progressively overloadable spinal flexion targeting upper and lower abs.',
      },
      {
        machineName: 'High Cable Rope Crunch',
        setupCue: 'Kneel below pulley, lock hips stationary, round upper spine ribs-to-hips.',
        targetBenefit: 'Pure abdominal loading without hip-flexor dominance.',
      },
    ],
    defaultMachinesAr: [
      {
        machineName: 'جهاز طحن البطن جالساً أو جهاز رفع الأرجل المعلّق',
        setupCue: 'طابق القفص الصدري مع محور الجهاز واثنِ الجذع نحو الحوض دون سحب بالذراعين.',
        targetBenefit: 'يسمح بزيادة الوزن التدريجية لاستهداف عضلات البطن بوضوح.',
      },
      {
        machineName: 'طحن البطن بالحبل بالكابل العالي',
        setupCue: 'اثنِ الركبتين أسفل الكابل مع تثبيت الورك واثنِ القفص الصدري نحو البطن.',
        targetBenefit: 'يعزل عضلات البطن ويمنع تدخل عضلات الورك.',
      },
    ],
    howToTargetEn: ['Exhale fully during contraction and curl the spine rather than hinging at hips.'],
    howToTargetAr: ['أخرج الزفير أثناء الانقباض واثنِ العمود الفقري بدلاً من الانحناء من الورك.'],
  },
  obliques: {
    id: 'obliques',
    category: 'core',
    view: 'front',
    nameEn: 'Obliques & Serratus',
    nameAr: 'عضلات الجوانب (المائلة)',
    roleEn: 'Rotational torque, side flexion, and anti-rotation core control.',
    roleAr: 'تدوير الجذع والثني الجانبي ومقاومة الالتواء.',
    defaultMachinesEn: [
      {
        machineName: 'Torso Rotation Machine / Cable Pallof Press & Woodchopper',
        setupCue: 'Adjust cable to chest height; rotate through ribs while keeping hips squared forward.',
        targetBenefit: 'Targets internal and external obliques smoothly with scalable load.',
      },
    ],
    defaultMachinesAr: [
      {
        machineName: 'جهاز تدوير الجذع أو الكابل الجانبي (Woodchopper)',
        setupCue: 'اضبط البكرة بمستوى الصدر ودوّر القفص الصدري مع ثبات الحوض للأمام.',
        targetBenefit: 'يستهدف عضلات الخصر المائلة بتوازن ومقاومة ثابتة.',
      },
    ],
    howToTargetEn: ['Control the return phase slowly—never let the weight stack snap you back.'],
    howToTargetAr: ['تحكم بمرحلة الرجوع ببطء دون السماح للأوزان بسحب الجذع بعنف.'],
  },
  quads: {
    id: 'quads',
    category: 'legs',
    view: 'front',
    nameEn: 'Quadriceps (Front Thighs)',
    nameAr: 'الأرجل الأمامية (الكوادريسبس)',
    roleEn: 'Knee extension during squats, lunges, leg presses, and extensions.',
    roleAr: 'مد مفصل الركبة في تمارين السكوات والدفع والتمديد.',
    defaultMachinesEn: [
      {
        machineName: '45° Leg Press & Hack Squat Machine',
        setupCue: 'Place feet lower on sled/platform for maximum knee flexion while heels stay flat.',
        targetBenefit: 'Allows deep quad stretch with zero lower-back stability bottleneck.',
      },
      {
        machineName: 'Seated Leg Extension Machine',
        setupCue: 'Align knee joint with yellow/red machine pivot dot; pad rests just above ankle.',
        targetBenefit: 'Direct isolation across all 4 quad heads including rectus femoris.',
      },
    ],
    defaultMachinesAr: [
      {
        machineName: 'جهاز دفع الأرجل (45° Leg Press) أو الهاك سكوات',
        setupCue: 'ضع القدمين في الجزء السفلي من المنصة لزيادة ثني الركبة مع إبقاء الكعبين ثابتين.',
        targetBenefit: 'يوفّر مدى حركة عميق للأرجل الأمامية دون إجهاد الظهر.',
      },
      {
        machineName: 'جهاز تمديد الأرجل جالساً (Leg Extension)',
        setupCue: 'طابق مفصل الركبة مع نقطة محور الجهاز وضع الوسادة فوق الكاحل مباشرة.',
        targetBenefit: 'عزل مباشر لرؤوس الفخذ الأمامية الأربعة.',
      },
    ],
    howToTargetEn: [
      'Track knees cleanly over toes without letting knees cave inward.',
      'Control descent for 2–3 seconds into deep knee flexion before driving up.',
    ],
    howToTargetAr: [
      'وجّه الركبتين بمحاذاة أصابع القدم دون انحرافهما للداخل.',
      'انزل ببطء (٢–٣ ثوانٍ) حتى ثني عميق للركبة قبل الدفع للأعلى.',
    ],
  },
  hamstrings: {
    id: 'hamstrings',
    category: 'legs',
    view: 'back',
    nameEn: 'Hamstrings (Back Thighs)',
    nameAr: 'الأرجل الخلفية (الهامسترنغ)',
    roleEn: 'Knee flexion and hip extension during hinges and curls.',
    roleAr: 'ثني الركبة وبسط الورك لحماية الركبتين وبناء الفخذ الخلفي.',
    defaultMachinesEn: [
      {
        machineName: 'Seated Leg Curl Machine',
        setupCue: 'Lock lap pad snugly over thighs and align knee joint with machine pivot.',
        targetBenefit: 'Flexing the hip pre-stretches hamstrings for superior hypertrophy.',
      },
      {
        machineName: 'Lying Prone Leg Curl Machine',
        setupCue: 'Keep hips pressed down into bench without arching lower back at peak squeeze.',
        targetBenefit: 'Trains hamstrings cleanly at shortened hip-extended positions.',
      },
    ],
    defaultMachinesAr: [
      {
        machineName: 'جهاز ثني الأرجل جالساً (Seated Leg Curl)',
        setupCue: 'ثبّت وسادة الفخذ بإحكام وطابق مفصل الركبة مع محور الجهاز.',
        targetBenefit: 'وضع الجلوس يطيل الهامسترنغ مسبقاً لتحفيز نمو أقوى.',
      },
      {
        machineName: 'جهاز ثني الأرجل منبطحاً (Lying Leg Curl)',
        setupCue: 'اضغط الحوض على المقعد وتجنّب رفع الورك أثناء سحب الكعبين.',
        targetBenefit: 'يستهدف العضلة الخلفية بانقباض قوي في نهاية الحركة.',
      },
    ],
    howToTargetEn: ['Keep toes pointed slightly toward shins or neutral and squeeze hard at bottom.'],
    howToTargetAr: ['حافظ على استقامة القدمين واضغط بقوة في ذروة الانقباض مع رجوع بطيء.'],
  },
  glutes: {
    id: 'glutes',
    category: 'legs',
    view: 'back',
    nameEn: 'Gluteus Maximus & Medius (Glutes)',
    nameAr: 'الأرداف (الغلوتس)',
    roleEn: 'Hip extension, external rotation, and pelvic stability.',
    roleAr: 'بسط مفصل الورك وتدويره للخارج وثبات الحوض.',
    defaultMachinesEn: [
      {
        machineName: 'Hip Thrust / Glute Bridge Machine',
        setupCue: 'Belts/pads centered over hip crease; shins vertical at top of bridge.',
        targetBenefit: 'Maximizes glute contraction safely without barbell balance hassle.',
      },
      {
        machineName: 'Seated Hip Abduction Machine',
        setupCue: 'Lean slightly forward to bias glute medius/upper glute fibers.',
        targetBenefit: 'Isolates lateral glute stability and hip abduction cleanly.',
      },
    ],
    defaultMachinesAr: [
      {
        machineName: 'جهاز الهيب ثراست (Hip Thrust Machine)',
        setupCue: 'ضع الحزام على خط الورك واجعل الساقين عموديتين في أعلى نقطة.',
        targetBenefit: 'يحقق أقصى انقباض للأرداف بأمان وسهولة ضبط الوزن.',
      },
      {
        machineName: 'جهاز فتح الفخذين جالساً (Hip Abduction)',
        setupCue: 'مِل بالجذع قليلاً للأمام وادفع بالركبتين للخارج بتحكم.',
        targetBenefit: 'يستهدف الجزء الجانبي والعلوي من الأرداف بتركيز عالٍ.',
      },
    ],
    howToTargetEn: ['Drive through heels and tuck ribs down—extend hips without hyperextending low back.'],
    howToTargetAr: ['ادفع عبر الكعبين واحرص على دفع الورك لأعلى دون تقويس أسفل الظهر.'],
  },
  calves: {
    id: 'calves',
    category: 'legs',
    view: 'both',
    nameEn: 'Calves (Gastrocnemius & Soleus)',
    nameAr: 'السمانة (عضلة بطة الساق)',
    roleEn: 'Ankle plantarflexion with straight knee (gastrocnemius) & bent knee (soleus).',
    roleAr: 'رفع الكعب مع ركبة مفرودة أو مثنية لبناء عضلة السمانة.',
    defaultMachinesEn: [
      {
        machineName: 'Standing Calf Raise Machine / 45° Leg Press Calf Raise',
        setupCue: 'Rest balls of feet on edge of block with legs straight (tiny 5° unlock).',
        targetBenefit: 'Trains the gastrocnemius across full deep ankle stretch.',
      },
      {
        machineName: 'Seated Calf Raise Machine',
        setupCue: 'Knee at 90° under thigh pad; pause 2 seconds in deepest heel-drop stretch.',
        targetBenefit: 'Isolates the deeper soleus muscle beneath the gastrocnemius.',
      },
    ],
    defaultMachinesAr: [
      {
        machineName: 'جهاز السمانة واقفاً أو على جهاز دفع الأرجل',
        setupCue: 'ضع مقدمة القدمين على حافة المنصة مع فرد الركبتين تقريباً.',
        targetBenefit: 'يستهدف الرأس الخارجي للسمانة عبر إطالة عميقة للكاحل.',
      },
      {
        machineName: 'جهاز السمانة جالساً (Seated Calf Raise)',
        setupCue: 'الركبة بزاوية ٩٠ درجة تحت الوسادة؛ توقف ثانيتين في أقصى نزول للكعب.',
        targetBenefit: 'يعزل عضلة السوليوس العميقة أسفل السمانة.',
      },
    ],
    howToTargetEn: [
      'Pause 1–2 seconds in the full bottom stretch on every rep—never bounce off the Achilles tendon.',
    ],
    howToTargetAr: [
      'توقّف ثانية إلى ثانيتين في أسفل نقطة لإطالة العضلة وتجنّب الارتداد السريع.',
    ],
  },
};

export const ALL_ANATOMY_MUSCLE_IDS: AnatomyMuscleId[] = Object.keys(ANATOMY_MUSCLES) as AnatomyMuscleId[];

const BUILTIN_EXERCISE_ANATOMY: Record<
  string,
  {primary: AnatomyMuscleId[]; secondary: AnatomyMuscleId[]; customMachineOverrideEn?: RecommendedMachineGuide[]; customMachineOverrideAr?: RecommendedMachineGuide[]}
> = {
  ex_bench_press: {
    primary: ['mid_chest', 'upper_chest'],
    secondary: ['anterior_delts', 'triceps'],
  },
  ex_incline_db_press: {
    primary: ['upper_chest', 'anterior_delts'],
    secondary: ['mid_chest', 'triceps'],
  },
  ex_cable_fly: {
    primary: ['mid_chest', 'upper_chest'],
    secondary: ['anterior_delts'],
  },
  ex_back_squat: {
    primary: ['quads', 'glutes'],
    secondary: ['hamstrings', 'lower_back', 'abs'],
  },
  ex_romanian_deadlift: {
    primary: ['hamstrings', 'glutes'],
    secondary: ['lower_back', 'forearms'],
  },
  ex_leg_press: {
    primary: ['quads', 'glutes'],
    secondary: ['hamstrings', 'calves'],
  },
  ex_walking_lunge: {
    primary: ['quads', 'glutes'],
    secondary: ['hamstrings', 'calves', 'abs'],
  },
  ex_deadlift: {
    primary: ['hamstrings', 'glutes', 'lower_back'],
    secondary: ['traps', 'lats', 'forearms', 'quads'],
  },
  ex_barbell_row: {
    primary: ['mid_back', 'lats'],
    secondary: ['posterior_delts', 'biceps', 'lower_back', 'forearms'],
  },
  ex_lat_pulldown: {
    primary: ['lats', 'mid_back'],
    secondary: ['biceps', 'posterior_delts', 'forearms'],
  },
  ex_pull_up: {
    primary: ['lats', 'mid_back'],
    secondary: ['biceps', 'posterior_delts', 'abs', 'forearms'],
  },
  ex_ohp: {
    primary: ['anterior_delts', 'lateral_delts'],
    secondary: ['triceps', 'upper_chest', 'abs'],
  },
  ex_lateral_raise: {
    primary: ['lateral_delts'],
    secondary: ['traps', 'anterior_delts'],
  },
  ex_face_pull: {
    primary: ['posterior_delts', 'mid_back'],
    secondary: ['traps', 'lateral_delts'],
  },
  ex_barbell_curl: {
    primary: ['biceps'],
    secondary: ['forearms'],
  },
  ex_tricep_pushdown: {
    primary: ['triceps'],
    secondary: ['forearms'],
  },
  ex_hanging_leg_raise: {
    primary: ['abs', 'obliques'],
    secondary: ['forearms'],
  },
  ex_plank: {
    primary: ['abs', 'obliques'],
    secondary: ['lower_back', 'anterior_delts', 'glutes'],
  },
};

function defaultMusclesForGroup(group: MuscleGroup): {
  primary: AnatomyMuscleId[];
  secondary: AnatomyMuscleId[];
} {
  switch (group) {
    case 'chest':
      return {primary: ['mid_chest', 'upper_chest'], secondary: ['anterior_delts', 'triceps']};
    case 'back':
      return {primary: ['lats', 'mid_back'], secondary: ['posterior_delts', 'biceps', 'lower_back']};
    case 'legs':
      return {primary: ['quads', 'glutes', 'hamstrings'], secondary: ['calves', 'lower_back']};
    case 'shoulders':
      return {primary: ['anterior_delts', 'lateral_delts'], secondary: ['posterior_delts', 'traps']};
    case 'arms':
      return {primary: ['biceps', 'triceps'], secondary: ['forearms']};
    case 'core':
      return {primary: ['abs', 'obliques'], secondary: ['lower_back']};
    case 'full_body':
      return {primary: ['quads', 'glutes', 'lats', 'mid_chest'], secondary: ['abs', 'anterior_delts', 'hamstrings']};
  }
}

export function getExerciseAnatomyTargets(ex: ExerciseDefinition): {
  primary: AnatomyMuscleId[];
  secondary: AnatomyMuscleId[];
} {
  return BUILTIN_EXERCISE_ANATOMY[ex.id] ?? defaultMusclesForGroup(ex.muscleGroup);
}

export function buildDefaultExerciseGuide(
  ex: ExerciseDefinition,
  lang: LanguageCode,
): ExerciseGuideRecord {
  const mapped = getExerciseAnatomyTargets(ex);
  const primaryLead = ANATOMY_MUSCLES[mapped.primary[0]];
  const machines: RecommendedMachineGuide[] = [];
  const seenNames = new Set<string>();

  for (const mId of mapped.primary) {
    const meta = ANATOMY_MUSCLES[mId];
    const list = lang === 'ar' ? meta.defaultMachinesAr : meta.defaultMachinesEn;
    for (const item of list) {
      if (!seenNames.has(item.machineName) && machines.length < 3) {
        seenNames.add(item.machineName);
        machines.push(item);
      }
    }
  }

  const steps = lang === 'ar' ? primaryLead.howToTargetAr : primaryLead.howToTargetEn;
  const displayName = lang === 'ar' && ex.nameAr ? ex.nameAr : ex.nameEn;

  return {
    id: ex.id,
    exerciseId: ex.id,
    exerciseName: displayName,
    primaryMuscles: mapped.primary,
    secondaryMuscles: mapped.secondary,
    recommendedMachines: machines,
    howToUseSteps: steps,
    commonMistakes:
      lang === 'ar'
        ? [
            'استخدام وزن زائد يؤدي للمرجحة وفقدان التركيز على العضلة المستهدفة.',
            'عدم ضبط ارتفاع المقعد أو الوسادة بما يتناسب مع محور المفصل.',
          ]
        : [
            'Using excessive load with body momentum instead of muscular tension.',
            'Skipping seat/pad pivot alignment before starting the working sets.',
          ],
    coachingSummary:
      lang === 'ar'
        ? `يستهدف تمرين ${displayName} بشكل أساسي ${primaryLead.nameAr} (${primaryLead.roleAr}). اضغط على «تحليل وتوجيه عبر Gemini» للحصول على خطة مخصصة لأدائك وهدفك.`
        : `${displayName} primarily targets ${primaryLead.nameEn} (${primaryLead.roleEn}). Use "Analyze with Gemini" for personalized machine cues based on your goal and recent loads.`,
  };
}
