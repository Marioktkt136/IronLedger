import {Injectable} from '@angular/core';
import {
  AnatomyMuscleId,
  EquipmentType,
  ExerciseChatMessage,
  FitnessGoal,
  LanguageCode,
  MealFoodItem,
  MealType,
  MuscleGroup,
  NutritionRecommendationResult,
  RecommendedMachineGuide,
  TrackingType,
  WeeklyPlanDay,
} from './models';

export interface GeminiExerciseAnalysisResponse {
  primaryMuscles: AnatomyMuscleId[];
  secondaryMuscles: AnatomyMuscleId[];
  recommendedMachines: RecommendedMachineGuide[];
  howToUseSteps: string[];
  commonMistakes: string[];
  coachingSummary: string;
}

export interface GeminiMealAnalysisResponse {
  title: string;
  totalCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  items: MealFoodItem[];
  nutritionNote: string;
}

export interface GeminiWeeklyPlanResponse {
  title: string;
  notes: string;
  days: WeeklyPlanDay[];
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as {error?: string; details?: string} & T;
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

@Injectable({providedIn: 'root'})
export class GeminiCoachService {
  analyzeExercise(input: {
    exerciseName: string;
    equipment: EquipmentType;
    muscleGroup: MuscleGroup;
    trackingType: TrackingType;
    userGoal: FitnessGoal;
    userNotes?: string;
    recentWeightKg?: number | null;
    language: LanguageCode;
  }): Promise<GeminiExerciseAnalysisResponse> {
    return postJson<GeminiExerciseAnalysisResponse>('/api/gemini/exercise-analyze', input);
  }

  async chatExercise(input: {
    exercise: {
      name: string;
      muscleGroup: MuscleGroup;
      equipment: EquipmentType;
      primaryMuscles: AnatomyMuscleId[];
      secondaryMuscles: AnatomyMuscleId[];
    };
    userGoal: FitnessGoal;
    recentWeightKg?: number | null;
    history: ExerciseChatMessage[];
    message: string;
    language: LanguageCode;
  }): Promise<string> {
    const res = await postJson<{reply: string}>('/api/gemini/exercise-chat', input);
    return res.reply;
  }

  analyzeMeal(input: {
    textDescription: string;
    imageBase64?: string;
    imageMimeType?: string;
    mealType: MealType;
    userGoal: FitnessGoal;
    language: LanguageCode;
  }): Promise<GeminiMealAnalysisResponse> {
    return postJson<GeminiMealAnalysisResponse>('/api/gemini/nutrition/analyze-meal', input);
  }

  recommendNutrition(input: {
    dailyTargetCalories: number;
    consumedCalories: number;
    consumedProteinG: number;
    targetProteinG: number;
    mealsToday: {title: string; totalCalories: number; proteinG: number}[];
    pantryItems: string[];
    userGoal: FitnessGoal;
    weightKg?: number | null;
    heightCm?: number | null;
    language: LanguageCode;
  }): Promise<NutritionRecommendationResult> {
    return postJson<NutritionRecommendationResult>('/api/gemini/nutrition/recommend', input);
  }

  generateWeeklyMealPlan(input: {
    pantryItems: string[];
    dailyTargetCalories: number;
    targetProteinG: number;
    userGoal: FitnessGoal;
    preferencesNote?: string;
    language: LanguageCode;
  }): Promise<GeminiWeeklyPlanResponse> {
    return postJson<GeminiWeeklyPlanResponse>('/api/gemini/nutrition/weekly-plan', input);
  }
}
