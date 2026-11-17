import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import {GoogleGenAI, Type} from '@google/genai';
import express from 'express';
import {join} from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

const GEMINI_MODEL = 'gemini-4-hydrogen';

const VALID_ANATOMY_MUSCLE_IDS = [
  'upper_chest',
  'mid_chest',
  'anterior_delts',
  'lateral_delts',
  'posterior_delts',
  'biceps',
  'triceps',
  'forearms',
  'lats',
  'traps',
  'mid_back',
  'lower_back',
  'abs',
  'obliques',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
] as const;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function sendGeminiError(res: express.Response, err: unknown, fallbackMessage: string): void {
  console.error('Gemini API error:', err);
  const message = err instanceof Error ? err.message : String(err);
  const status = message.includes('429') || message.includes('RESOURCE_EXHAUSTED') ? 429 : 500;
  res.status(status).json({
    error: fallbackMessage,
    details: message,
  });
}

app.use('/api', express.json({limit: '10mb'}));

app.post('/api/gemini/exercise-analyze', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error: 'Gemini API key is not configured on the server.',
    });
    return;
  }

  try {
    const body = req.body ?? {};
    const exerciseName = String(body.exerciseName ?? '').trim().slice(0, 120);
    const equipment = String(body.equipment ?? 'machine').trim().slice(0, 40);
    const muscleGroup = String(body.muscleGroup ?? 'chest').trim().slice(0, 40);
    const trackingType = String(body.trackingType ?? 'weight_reps').trim().slice(0, 40);
    const userGoal = String(body.userGoal ?? 'hypertrophy').trim().slice(0, 40);
    const userNotes = String(body.userNotes ?? '').trim().slice(0, 400);
    const recentWeightKg = typeof body.recentWeightKg === 'number' ? body.recentWeightKg : null;
    const language = body.language === 'ar' ? 'ar' : 'en';

    if (!exerciseName) {
      res.status(400).json({error: 'Exercise name is required.'});
      return;
    }

    const langDirective =
      language === 'ar'
        ? 'Write all human-readable text fields strictly in clear natural Arabic (العربية). Keep muscle IDs strictly from the allowed English enum list.'
        : 'Write all human-readable text fields strictly in clear natural English. Keep muscle IDs strictly from the allowed enum list.';

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        `Exercise: ${exerciseName}`,
        `Primary Category: ${muscleGroup}`,
        `Equipment: ${equipment}`,
        `Tracking Mode: ${trackingType}`,
        `Athlete Goal: ${userGoal}`,
        recentWeightKg ? `Athlete Recent Working Load: ${recentWeightKg} kg` : 'No prior load logged yet.',
        userNotes ? `Athlete Notes: ${userNotes}` : '',
        'Identify the exact primary and secondary human anatomy muscles targeted, recommend 2-3 gym machines (plate-loaded, selectorized, or cable) that isolate/target those exact muscles effectively, and give a concise step-by-step guide on seat height, pad alignment, grip/stance, range of motion, and common mistakes to avoid.',
      ]
        .filter(Boolean)
        .join('\n'),
      config: {
        systemInstruction:
          `You are an expert biomechanics and strength-training coach. ${langDirective} ` +
          `Allowed anatomy muscle IDs for primaryMuscles and secondaryMuscles: ${VALID_ANATOMY_MUSCLE_IDS.join(', ')}. ` +
          'Never invent muscle IDs outside that list. Keep machine guides practical, accurate, and concise.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryMuscles: {
              type: Type.ARRAY,
              items: {type: Type.STRING, enum: [...VALID_ANATOMY_MUSCLE_IDS]},
              description: '1 to 3 primary targeted human anatomy muscle IDs.',
            },
            secondaryMuscles: {
              type: Type.ARRAY,
              items: {type: Type.STRING, enum: [...VALID_ANATOMY_MUSCLE_IDS]},
              description: '0 to 4 secondary synergist/stabilizer muscle IDs.',
            },
            recommendedMachines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  machineName: {type: Type.STRING},
                  setupCue: {type: Type.STRING},
                  targetBenefit: {type: Type.STRING},
                },
                required: ['machineName', 'setupCue', 'targetBenefit'],
              },
            },
            howToUseSteps: {
              type: Type.ARRAY,
              items: {type: Type.STRING},
              description: '4 to 6 actionable setup & execution steps.',
            },
            commonMistakes: {
              type: Type.ARRAY,
              items: {type: Type.STRING},
              description: '2 to 4 common form mistakes to avoid.',
            },
            coachingSummary: {
              type: Type.STRING,
              description: 'Concise 2-3 sentence biomechanical coaching overview.',
            },
          },
          required: [
            'primaryMuscles',
            'secondaryMuscles',
            'recommendedMachines',
            'howToUseSteps',
            'commonMistakes',
            'coachingSummary',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err) {
    sendGeminiError(res, err, 'Failed to analyze exercise with Gemini.');
  }
});

app.post('/api/gemini/exercise-chat', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error: 'Gemini API key is not configured on the server.',
    });
    return;
  }

  try {
    const body = req.body ?? {};
    const exercise = body.exercise ?? {};
    const message = String(body.message ?? '').trim().slice(0, 1500);
    const language = body.language === 'ar' ? 'ar' : 'en';
    const userGoal = String(body.userGoal ?? 'hypertrophy').slice(0, 40);
    const recentWeightKg = typeof body.recentWeightKg === 'number' ? body.recentWeightKg : null;
    const rawHistory = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      res.status(400).json({error: 'Message is required.'});
      return;
    }

    const history = rawHistory
      .slice(-10)
      .filter(
        (m: unknown): m is {role: 'user' | 'model'; text: string} =>
          typeof m === 'object' &&
          m !== null &&
          ((m as {role?: unknown}).role === 'user' || (m as {role?: unknown}).role === 'model') &&
          typeof (m as {text?: unknown}).text === 'string' &&
          (m as {text: string}).text.trim().length > 0,
      )
      .map((m: {role: 'user' | 'model'; text: string}) => ({
        role: m.role,
        parts: [{text: m.text.slice(0, 1500)}],
      }));

    const langDirective =
      language === 'ar'
        ? 'Reply strictly in clear natural Arabic (العربية) unless the user asks for English terms.'
        : 'Reply strictly in clear natural English.';

    const systemInstruction = [
      'You are IronLedger Coach, an evidence-based strength training, anatomy, and gym-machine biomechanics specialist.',
      langDirective,
      `Focused Exercise: ${String(exercise.name ?? 'General Lift')} (Category: ${String(exercise.muscleGroup ?? '')}, Equipment: ${String(exercise.equipment ?? '')}).`,
      Array.isArray(exercise.primaryMuscles) && exercise.primaryMuscles.length
        ? `Primary Muscles: ${exercise.primaryMuscles.join(', ')}.`
        : '',
      Array.isArray(exercise.secondaryMuscles) && exercise.secondaryMuscles.length
        ? `Secondary Muscles: ${exercise.secondaryMuscles.join(', ')}.`
        : '',
      `Athlete Goal: ${userGoal}.`,
      recentWeightKg ? `Recent Logged Working Load: ${recentWeightKg} kg.` : '',
      'Give concise, practical, actionable coaching on biomechanics, machine seat/pin adjustments, tempo, progressive overload, and injury-safe cues. Keep answers focused and easy to read in a gym.',
    ]
      .filter(Boolean)
      .join('\n');

    const chat = ai.chats.create({
      model: GEMINI_MODEL,
      config: {systemInstruction},
      history,
    });

    const response = await chat.sendMessage({message});
    res.json({
      reply: (response.text ?? '').trim(),
    });
  } catch (err) {
    sendGeminiError(res, err, 'Failed to get exercise coaching reply from Gemini.');
  }
});

app.post('/api/gemini/nutrition/analyze-meal', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error: 'Gemini API key is not configured on the server.',
    });
    return;
  }

  try {
    const body = req.body ?? {};
    const textDescription = String(body.textDescription ?? '').trim().slice(0, 1000);
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : '';
    const imageMimeType = typeof body.imageMimeType === 'string' ? body.imageMimeType.trim() : 'image/jpeg';
    const mealType = String(body.mealType ?? 'lunch').slice(0, 24);
    const userGoal = String(body.userGoal ?? 'hypertrophy').slice(0, 40);
    const language = body.language === 'ar' ? 'ar' : 'en';

    if (!textDescription && !imageBase64) {
      res.status(400).json({error: 'Provide a meal description or upload a meal photo.'});
      return;
    }

    const parts: ({inlineData: {mimeType: string; data: string}} | {text: string})[] = [];
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType.startsWith('image/') ? imageMimeType : 'image/jpeg',
          data: imageBase64,
        },
      });
    }
    parts.push({
      text: [
        `Meal slot: ${mealType}`,
        `Athlete goal: ${userGoal}`,
        textDescription ? `User description: ${textDescription}` : 'Estimate from the attached meal photo.',
        'Identify each visible or described food item, realistic portion size, calories, protein (g), carbs (g), fat (g), fiber (g), and overall meal totals.',
      ].join('\n'),
    });

    const langDirective =
      language === 'ar'
        ? 'Write meal title, item names, portions, and nutritionNote strictly in clear Arabic (العربية).'
        : 'Write meal title, item names, portions, and nutritionNote strictly in clear English.';

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {parts},
      config: {
        systemInstruction:
          `You are a sports nutritionist and calorie estimator. ${langDirective} ` +
          'Provide realistic, practical calorie and macronutrient estimates. Ensure totalCalories is reasonably consistent with the sum of items.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {type: Type.STRING, description: 'Concise meal title.'},
            totalCalories: {type: Type.INTEGER, description: 'Total meal calories (kcal).'},
            proteinG: {type: Type.NUMBER},
            carbsG: {type: Type.NUMBER},
            fatG: {type: Type.NUMBER},
            fiberG: {type: Type.NUMBER},
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: {type: Type.STRING},
                  portion: {type: Type.STRING},
                  calories: {type: Type.INTEGER},
                  proteinG: {type: Type.NUMBER},
                  carbsG: {type: Type.NUMBER},
                  fatG: {type: Type.NUMBER},
                },
                required: ['name', 'portion', 'calories', 'proteinG', 'carbsG', 'fatG'],
              },
            },
            nutritionNote: {type: Type.STRING, description: '1-2 sentence nutrition tip for this meal.'},
          },
          required: ['title', 'totalCalories', 'proteinG', 'carbsG', 'fatG', 'fiberG', 'items', 'nutritionNote'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err) {
    sendGeminiError(res, err, 'Failed to analyze meal with Gemini.');
  }
});

app.post('/api/gemini/nutrition/recommend', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error: 'Gemini API key is not configured on the server.',
    });
    return;
  }

  try {
    const body = req.body ?? {};
    const dailyTargetCalories = Number(body.dailyTargetCalories ?? 2200);
    const consumedCalories = Number(body.consumedCalories ?? 0);
    const consumedProteinG = Number(body.consumedProteinG ?? 0);
    const targetProteinG = Number(body.targetProteinG ?? 150);
    const mealsToday = Array.isArray(body.mealsToday) ? body.mealsToday.slice(0, 12) : [];
    const pantryItems = Array.isArray(body.pantryItems) ? body.pantryItems.slice(0, 40) : [];
    const userGoal = String(body.userGoal ?? 'hypertrophy').slice(0, 40);
    const weightKg = typeof body.weightKg === 'number' ? body.weightKg : null;
    const heightCm = typeof body.heightCm === 'number' ? body.heightCm : null;
    const language = body.language === 'ar' ? 'ar' : 'en';

    const langDirective =
      language === 'ar'
        ? 'Write all text fields strictly in natural Arabic (العربية).'
        : 'Write all text fields strictly in natural English.';

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        `Athlete Goal: ${userGoal}`,
        weightKg ? `Weight: ${weightKg} kg` : '',
        heightCm ? `Height: ${heightCm} cm` : '',
        `Daily Calorie Target: ${dailyTargetCalories} kcal | Consumed Today: ${consumedCalories} kcal | Remaining: ${Math.max(0, dailyTargetCalories - consumedCalories)} kcal`,
        `Protein Today: ${consumedProteinG}g / ${targetProteinG}g`,
        mealsToday.length
          ? `Meals already logged today: ${mealsToday.map((m: {title?: string; totalCalories?: number; proteinG?: number}) => `${m.title ?? 'Meal'} (${m.totalCalories ?? 0} kcal, ${m.proteinG ?? 0}g protein)`).join('; ')}`
          : 'No meals logged yet today.',
        pantryItems.length
          ? `Foods currently available at home: ${pantryItems.join(', ')}`
          : 'No specific pantry items listed yet.',
        'Provide a personalized nutrition evaluation of today so far and recommend 3-4 specific foods or quick meals to eat next (prioritizing pantry items when applicable) plus 1 hydration/recovery tip.',
      ]
        .filter(Boolean)
        .join('\n'),
      config: {
        systemInstruction: `You are a certified sports nutrition coach. ${langDirective}`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {type: Type.STRING},
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: {type: Type.STRING},
                  reason: {type: Type.STRING},
                  estimatedCalories: {type: Type.INTEGER},
                  proteinG: {type: Type.NUMBER},
                  carbsG: {type: Type.NUMBER},
                  fatG: {type: Type.NUMBER},
                  usesPantry: {type: Type.BOOLEAN},
                },
                required: ['title', 'reason', 'estimatedCalories', 'proteinG', 'carbsG', 'fatG', 'usesPantry'],
              },
            },
            hydrationOrTimingTip: {type: Type.STRING},
          },
          required: ['summary', 'suggestions', 'hydrationOrTimingTip'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err) {
    sendGeminiError(res, err, 'Failed to generate nutrition recommendations with Gemini.');
  }
});

app.post('/api/gemini/nutrition/weekly-plan', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error: 'Gemini API key is not configured on the server.',
    });
    return;
  }

  try {
    const body = req.body ?? {};
    const pantryItems = Array.isArray(body.pantryItems)
      ? body.pantryItems.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 50)
      : [];
    const dailyTargetCalories = Number(body.dailyTargetCalories ?? 2200);
    const targetProteinG = Number(body.targetProteinG ?? 150);
    const userGoal = String(body.userGoal ?? 'hypertrophy').slice(0, 40);
    const preferencesNote = String(body.preferencesNote ?? '').trim().slice(0, 300);
    const language = body.language === 'ar' ? 'ar' : 'en';

    if (pantryItems.length === 0) {
      res.status(400).json({error: 'Add at least one available food item before generating a weekly meal plan.'});
      return;
    }

    const langDirective =
      language === 'ar'
        ? 'Write the plan title, day labels (e.g., اليوم ١ - السبت ...), meal descriptions, and notes strictly in natural Arabic (العربية).'
        : 'Write the plan title, day labels (Day 1 - Monday through Day 7 - Sunday), meal descriptions, and notes strictly in natural English.';

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        `Available Foods the Athlete Has: ${pantryItems.join(', ')}`,
        `Athlete Goal: ${userGoal}`,
        `Daily Calorie Target: ~${dailyTargetCalories} kcal | Daily Protein Target: ~${targetProteinG} g`,
        preferencesNote ? `Additional Notes: ${preferencesNote}` : '',
        'Build a balanced 7-day weekly meal plan maximizing use of the available foods above (you may include basic pantry staples like water/salt/spices or 1-2 brief add-ons in notes).',
        'Keep each breakfast, lunch, dinner, and snack entry concise and scannable (12-18 words max, including calories & protein, e.g. "150g chicken breast, 100g basmati rice, broccoli — 560 kcal, 48g P").',
      ]
        .filter(Boolean)
        .join('\n'),
      config: {
        systemInstruction: `You are an expert meal planner and sports dietitian. ${langDirective} Output strictly 7 concise days and keep notes to 1-2 short sentences.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {type: Type.STRING},
            notes: {type: Type.STRING},
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayLabel: {type: Type.STRING},
                  totalCalories: {type: Type.INTEGER},
                  proteinG: {type: Type.NUMBER},
                  breakfast: {type: Type.STRING},
                  lunch: {type: Type.STRING},
                  dinner: {type: Type.STRING},
                  snack: {type: Type.STRING},
                },
                required: ['dayLabel', 'totalCalories', 'proteinG', 'breakfast', 'lunch', 'dinner', 'snack'],
              },
            },
          },
          required: ['title', 'notes', 'days'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err) {
    sendGeminiError(res, err, 'Failed to generate weekly meal plan with Gemini.');
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
