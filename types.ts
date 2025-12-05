

export enum AspectRatio {
  SQUARE = '1:1',
  LANDSCAPE = '16:9',
  PORTRAIT = '9:16',
  FOUR_THIRDS = '4:3',
  THREE_FOURTHS = '3:4'
}

export type ImageStyle = 'realistic' | 'pixar' | 'lego' | 'ghibli' | 'gta' | 'minecraft' | 'funko' | 'claymation' | 'simpsons' | 'retro-anime' | 'barbie' | 'cyberpunk' | 'watercolor' | 'vector' | 'neon' | 'coloring-book' | 'steampunk' | 'oil-painting' | 'pop-art' | 'ukiyo-e';

export type Resolution = '1k' | '2k' | '4k';

export interface GeneratedImage {
  id: string;
  url: string;
  angle: string;
  prompt: string;
  timestamp: number;
  resolution: Resolution;
}

export type GeminiModel = 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview';

// Removed 'transparent' from strict type, but kept compatibility if needed internally
export type BackgroundColor = 'black' | 'white' | 'green'; 

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[]; // Hex codes
  isCustom?: boolean;
}

export interface GenerationConfig {
  model: GeminiModel;
  prompt: string;
  style: ImageStyle;
  aspectRatio: AspectRatio;
  background: BackgroundColor;
  resolution: Resolution;
  includeLeft: boolean;
  includeRight: boolean;
  includeTop: boolean;
  includeFront: boolean;
  includeIsometric: boolean;
  batchCount: number;
  useBorder: boolean;
  selectedPaletteId: string | null; // New: ID of selected palette
}