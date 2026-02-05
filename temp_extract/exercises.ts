import { Exercise } from "./types";

export const exercises: Exercise[] = [
  {
    id: "squats",
    name: "Air Squats",
    type: "rep",
    focus: ['legs', 'total'],
    thresholds: { beginner: 15, intermediate: 25, advanced: 40, elite: 60 }
  },
  {
    id: "pushups",
    name: "Push Ups",
    type: "rep",
    focus: ['arms', 'core', 'total'],
    thresholds: { beginner: 10, intermediate: 20, advanced: 35, elite: 50 }
  },
  {
    id: "lunges",
    name: "Alt. Lunges",
    type: "rep",
    focus: ['legs', 'total'],
    thresholds: { beginner: 20, intermediate: 30, advanced: 50, elite: 70 }
  },
  {
    id: "plank",
    name: "Plank Hold",
    type: "hold",
    focus: ['core', 'total'],
    thresholds: { beginner: 30, intermediate: 60, advanced: 90, elite: 120 }
  },
  {
    id: "burpees",
    name: "Burpees",
    type: "rep",
    focus: ['total', 'legs', 'arms'],
    thresholds: { beginner: 10, intermediate: 15, advanced: 25, elite: 40 }
  },
  {
    id: "mountain_climbers",
    name: "Mountain Climbers",
    type: "rep",
    focus: ['core', 'total', 'legs'],
    thresholds: { beginner: 30, intermediate: 50, advanced: 80, elite: 120 }
  },
  {
    id: "jumping_jacks",
    name: "Jumping Jacks",
    type: "rep",
    focus: ['total', 'legs'],
    thresholds: { beginner: 30, intermediate: 50, advanced: 80, elite: 120 }
  },
  {
    id: "crunches",
    name: "Crunches",
    type: "rep",
    focus: ['core'],
    thresholds: { beginner: 20, intermediate: 40, advanced: 60, elite: 100 }
  }
];

export const focusAreas = [
  { id: 'arms', name: 'Arms', description: 'Upper body strength' },
  { id: 'legs', name: 'Legs', description: 'Lower body power' },
  { id: 'core', name: 'Core', description: 'Stability & abs' },
  { id: 'total', name: 'Total Body', description: 'Full intensity' }
];

export const burnoutTypes = [
  {
    id: 'classic',
    name: 'Classic Burnout',
    description: 'Standard intervals. Max reps in given time.'
  },
  {
    id: 'pyramid',
    name: 'Pyramid Scheme',
    description: 'Reps increase then decrease. Don\'t fall behind.'
  },
  {
    id: 'sudden-death',
    name: 'Sudden Death',
    description: 'Miss a threshold, you are eliminated.'
  },
  {
    id: 'time-attack',
    name: 'Time Attack',
    description: 'Complete the target reps as fast as possible.'
  }
];
