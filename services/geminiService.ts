
import { GoogleGenAI } from "@google/genai";
import { AspectRatio, GeminiModel, BackgroundColor, ImageStyle, Resolution, ColorPalette } from '../types';

const constructPrompt = (
  userPrompt: string, 
  angle: string, 
  hasReference: boolean, 
  background: BackgroundColor, 
  style: ImageStyle, 
  isEditing: boolean = false,
  useBorder: boolean = false,
  palette: ColorPalette | null = null
): string => {
  // Base negatives (always unwanted)
  const baseNegatives = [
    'text', 'writing', 'letters', 'typography', 'watermarks', 'signatures', 'copyright',
    'logos', 'brand names', 'trademarks', 'branding', 'labels',
    'fingers', 'hands', 'holding',
    'complex background', 'gradient background', 'shadows on wall', 'reflection'
  ];

  // If No Border is selected, force clean edges
  if (!useBorder) {
      baseNegatives.push(
          'border', 'frame', 'vignette', 'dark corners', 'fading edges', 
          'shadow margin', 'blur edges', 'out of frame', 'cropped', 'cinematic bars'
      );
  }

  let styleInstruction = '';
  let specificNegatives: string[] = [];
  let backgroundInstruction = '';

  // Configure Famous / Pop Culture Styles
  switch (style) {
    case 'pixar':
      styleInstruction = `
        STYLE: 3D ANIMATION STUDIO (Pixar-style).
        - Technique: High-end 3D rendering (RenderMan), subsurface scattering on materials.
        - Details: Soft lighting, expressive shapes, vibrant colors, "chunky" but detailed textures.
        - Vibe: Friendly, cute, high-budget animated movie asset.
      `;
      specificNegatives = ['photorealistic', 'noise', 'grain', 'sketch', '2d', 'anime'];
      break;

    case 'lego':
      styleInstruction = `
        STYLE: PLASTIC BRICK CONSTRUCTION (Lego-style).
        - Technique: The entire object is built from realistic plastic interlocking bricks.
        - Details: Visible studs, plastic material sheen, slight bevels between bricks.
        - Vibe: Playful, constructed, miniature.
      `;
      specificNegatives = ['smooth surface', 'metal', 'organic', 'curved continuous surface'];
      break;

    case 'ghibli':
      styleInstruction = `
        STYLE: JAPANESE ANIMATION (Studio Ghibli style).
        - Technique: Hand-painted watercolor backgrounds (though here background is solid), cel-shaded character/object with detailed line work.
        - Details: Lush colors, nostalgic feel, attention to small mechanical or organic details.
        - Vibe: Magical realism, traditional animation.
      `;
      specificNegatives = ['3d', 'render', 'glossy', 'photorealistic', 'vector'];
      break;

    case 'gta':
      styleInstruction = `
        STYLE: VIDEO GAME LOADING SCREEN (GTA V Art Style).
        - Technique: Digital vector-painting hybrid. sharp contours, heavy black outlines.
        - Details: High contrast shadows, saturated colors, comic-book realism.
        - Vibe: Cool, edgy, action-game concept art.
      `;
      specificNegatives = ['soft', 'blurry', '3d render', 'pixel art'];
      break;

    case 'minecraft':
      styleInstruction = `
        STYLE: VOXEL ART (Minecraft style).
        - Technique: Object is made entirely of large cubic blocks (voxels).
        - Details: Low-res pixel textures on 3D cubes. No curves, only 90-degree angles.
        - Vibe: Blocky, gaming, 8-bit 3D.
      `;
      specificNegatives = ['curves', 'circles', 'smooth', 'high res', 'round'];
      break;

    case 'funko':
      styleInstruction = `
        STYLE: VINYL COLLECTIBLE FIGURE (Funko Pop style).
        - Technique: Physical toy photography look.
        - Details: Oversized head (if applicable), large black button eyes, smooth vinyl plastic texture.
        - Vibe: Collectible toy, merchandise.
      `;
      specificNegatives = ['realistic skin', 'fur', 'detailed eyes', 'human proportions'];
      break;
    
    case 'claymation':
      styleInstruction = `
        STYLE: 3D CLAY / PLASTICINE (Aardman/Laika style).
        - Technique: Stop-motion aesthetic.
        - Details: Visible fingerprints in the clay, imperfect soft edges, matte finish, soft global illumination.
        - Vibe: Handmade, tactile, cute.
      `;
      specificNegatives = ['glossy plastic', 'cg', 'sharp edges', 'digital', 'low poly'];
      break;

    case 'simpsons':
      styleInstruction = `
        STYLE: AMERICAN SITCOM ANIMATION (The Simpsons style).
        - Technique: Flat 2D animation, yellow skin tones (if human), black outlines.
        - Details: Simple geometric shapes, solid colors, no shading or gradients.
        - Vibe: Cartoon, satirical, simple.
      `;
      specificNegatives = ['shading', '3d', 'realistic', 'detailed'];
      break;

    case 'retro-anime':
      styleInstruction = `
        STYLE: 90s RETRO ANIME (Sailor Moon / Evangelion aesthetic).
        - Technique: Cel animation with film grain.
        - Details: Pastel highlights, slightly washed out colors, "bloom" lighting effect.
        - Vibe: Nostalgic, lo-fi aesthetic.
      `;
      specificNegatives = ['hd', '4k', 'sharp', 'modern', '3d'];
      break;
    
    case 'barbie':
      styleInstruction = `
        STYLE: FASHION DOLL PLASTIC (Barbie style).
        - Technique: Hot pink accents, glossy plastic, synthetic materials.
        - Details: Idealized smooth forms, toy-like manufacturing seams.
        - Vibe: Glamorous, plastic, bright.
      `;
      specificNegatives = ['grunge', 'dark', 'dirt', 'matte', 'rustic'];
      break;

    case 'cyberpunk':
      styleInstruction = `
        STYLE: CYBERPUNK / NEON NOIR.
        - Technique: Digital art, high contrast, neon accents (pink/blue/cyan).
        - Details: Glowing edges, futuristic materials, carbon fiber textures.
        - Vibe: High-tech, dystopian.
      `;
      specificNegatives = ['rustic', 'vintage', 'organic'];
      break;

    case 'watercolor':
      styleInstruction = `
        STYLE: CLEAN WATERCOLOR ILLUSTRATION.
        - Technique: Wet-on-wet paint application, BUT contained strictly within the subject.
        - Details: Soft color transitions, pigment pooling inside the object.
        - Vibe: Artistic, dreamy, but CLEAN.
        - IMPORTANT: NO SPLATTERS, NO DRIPS, NO MESSY PAINT OUTSIDE THE LINES. The background must remain perfectly clean.
      `;
      specificNegatives = ['splatters', 'paint drops', 'messy', 'spill', 'dirty background', 'dots', 'spray', '3d', 'render', 'solid lines', 'vector', 'plastic', 'glossy'];
      break;

    case 'vector':
      styleInstruction = `
        STYLE: FLAT ILLUSTRATION (Vector Art).
        - Technique: Adobe Illustrator style, flat design.
        - Details: Clean curves, solid fill colors, no gradients (or very simple ones), no texture.
        - Vibe: Minimalist, corporate art, icon design, clean.
      `;
      specificNegatives = ['texture', 'noise', 'shading', '3d', 'photo', 'realistic', 'brush strokes'];
      break;

    case 'neon':
      styleInstruction = `
        STYLE: NEON LINE ART.
        - Technique: Glowing light tubes against a dark void.
        - Details: The object is defined ONLY by glowing outlines of light (Blue/Pink/Purple).
        - Vibe: Club, nightlife, minimalist synthwave.
      `;
      specificNegatives = ['daylight', 'solid surfaces', 'matte', 'texture'];
      break;

    // --- NEW STYLES ---

    case 'coloring-book':
      styleInstruction = `
        STYLE: COLORING BOOK PAGE (Line Art).
        - Technique: Black and white line drawing.
        - Details: Clear, continuous black outlines. NO fill, NO gray, NO shading. Pure white interior and background.
        - Vibe: Educational, simple, ready to color.
      `;
      specificNegatives = ['color', 'shading', 'gray', 'gradient', 'texture', 'photo', '3d', 'fill', 'paint'];
      break;

    case 'steampunk':
      styleInstruction = `
        STYLE: STEAMPUNK (Victorian Sci-Fi).
        - Technique: Brass, copper, and mahogany materials.
        - Details: Exposed gears, clockwork mechanisms, steam pipes, vintage leather, rivets.
        - Vibe: Industrial, mechanical, vintage antique.
      `;
      specificNegatives = ['modern', 'plastic', 'digital', 'clean', 'minimal', 'neon'];
      break;

    case 'oil-painting':
      styleInstruction = `
        STYLE: CLASSIC OIL PAINTING (Impressionist).
        - Technique: Thick impasto brush strokes, textured canvas look.
        - Details: Rich, blended colors, visible brush movement, painterly lighting.
        - Vibe: Museum masterpiece, traditional art, expressive.
      `;
      specificNegatives = ['digital', 'vector', 'flat', 'smooth', '3d render', 'photo'];
      break;

    case 'pop-art':
      styleInstruction = `
        STYLE: POP ART (Warhol / Lichtenstein).
        - Technique: Halftone dots, bold heavy outlines.
        - Details: High contrast, saturated primary colors, repetitive patterns, comic-book shading.
        - Vibe: Retro 60s, advertising, bold.
      `;
      specificNegatives = ['realistic', 'subtle', 'pastel', '3d', 'shading'];
      break;

    case 'ukiyo-e':
      styleInstruction = `
        STYLE: UKIYO-E (Japanese Woodblock Print).
        - Technique: Traditional block printing (Hokusai style).
        - Details: Flat perspective, bold outlines, Prussian blue and indigo palette, paper texture.
        - Vibe: Traditional Japanese, historical, flat.
      `;
      specificNegatives = ['3d', 'shiny', 'glossy', 'realistic', 'modern', 'digital gradient'];
      break;

    case 'realistic':
    default:
      styleInstruction = `
        STYLE: MACRO PHOTOGRAPHY (Sony Alpha).
        - Camera: Sony Alpha 1, 90mm Macro G OSS lens.
        - Settings: f/11 for deep depth of field, hyper-realistic, 8k texture detail.
        - Lighting: Studio lighting, soft box.
        - Vibe: Professional Product Photography.
      `;
      specificNegatives = ['drawing', 'painting', 'illustration', 'cartoon', 'anime', 'sketch', 'vector', 'flat', '2d'];
      break;
  }

  // Define Background Instruction based on color
  if (background === 'black') {
    backgroundInstruction = "BACKGROUND: PURE SOLID HEX #000000 (Black). The subject must be completely isolated in a black void. NO light spill or shadows on background.";
  } else if (background === 'green') {
    // UPDATED: Extremely strict instruction for flat lighting on background to enable transparency
    backgroundInstruction = "BACKGROUND: PURE SOLID HEX #00FF00 (Green Chroma Key). IMPORTANT: The floor and background must be FLAT GREEN with NO SHADOWS, NO REFLECTIONS, and NO GRADIENTS. The object must look like it is floating on a green layer.";
  } else {
    backgroundInstruction = "BACKGROUND: PURE SOLID HEX #FFFFFF (White). The subject must be completely isolated on a white background. NO shadows on the edges of the image.";
  }

  // Combine Negatives
  const allNegatives = [...baseNegatives, ...specificNegatives];

  let coreInstruction = '';
  
  if (hasReference) {
    if (isEditing) {
      coreInstruction = `
        TASK: IMAGE EDITING & MODIFICATION.
        INPUT: Use the provided Reference Image as the primary source of truth.
        INSTRUCTION: Modify the reference image according to this request: "${userPrompt}".
        RULES: Keep the original camera angle and composition. Modify only what is requested. Maintain the "${style}" aesthetic.
      `;
    } else {
      coreInstruction = `
        TASK: VISUAL ANALYSIS & RE-GENERATION.
        INPUT: Analyze the REFERENCE IMAGE features.
        ACTION: Generate a COMPLETELY NEW IMAGE of this object type in 3D space.
        VIEW ANGLE: ${angle}.
        RULES: Maintain consistent identity with reference.
      `;
    }
  } else {
    coreInstruction = `
      TASK: Generate a ${style} image of: ${userPrompt}.
      VIEW ANGLE: ${angle}.
    `;
  }

  let borderInstruction = "";
  if (useBorder) {
      borderInstruction = "4. ADD A CINEMATIC BORDER or VIGNETTE effect to focus the eye.";
  } else {
      borderInstruction = "4. IMPORTANT: FULL BLEED. ABSOLUTELY NO BORDERS, NO VIGNETTE, NO DARK CORNERS. The object must be fully visible with breathing room from the edge.";
  }

  // COLOR PALETTE INSTRUCTION
  let paletteInstruction = "";
  if (palette && palette.colors.length > 0) {
      paletteInstruction = `5. COLOR PALETTE: STRICTLY USE THESE COLORS: [${palette.colors.join(', ')}]. The object and key elements MUST adhere to this color scheme.`;
  }

  return `
    ${coreInstruction}
    
    STRICT GENERATION RULES:
    1. ${styleInstruction}
    2. ${backgroundInstruction}
    3. EXCLUSIONS: ${allNegatives.join(', ')}.
    ${borderInstruction}
    ${paletteInstruction}
    
    Ensure there is absolutely NO TEXT or LOGO on the object unless requested.
  `.trim();
};

export const generateSingleImage = async (
  model: GeminiModel, 
  prompt: string,
  aspectRatio: AspectRatio,
  angle: string,
  seed: number,
  background: BackgroundColor, 
  style: ImageStyle,
  resolution: Resolution,
  apiKey: string, // NEW: Explicit API Key
  referenceImageBase64?: string,
  isEditing: boolean = false,
  useBorder: boolean = false,
  palette: ColorPalette | null = null
): Promise<{ url: string; usedModel: string } | null> => {
  try {
    // Priority: Manual Key -> Environment Variable -> Throw Error
    const validApiKey = apiKey || process.env.API_KEY;
    if (!validApiKey) throw new Error("No API Key provided.");

    const ai = new GoogleGenAI({ apiKey: validApiKey });
    
    const fullPrompt = constructPrompt(prompt, angle, !!referenceImageBase64, background, style, isEditing, useBorder, palette);

    const parts: any[] = [];
    
    if (referenceImageBase64) {
      const base64Data = referenceImageBase64.split(',')[1] || referenceImageBase64;
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: base64Data
        }
      });
    }

    parts.push({ text: fullPrompt });

    // Determine Model:
    // If resolution demands high quality (2k/4k), we usually force gemini-3-pro-image-preview.
    // However, if the user explicitly selected a model in settings, we should try to honor it,
    // unless the task is physically impossible for the model (e.g., 2.5 Flash might not support 4K in future, but currently we map by resolution).
    // For now, let's stick to the Resolution mapping for '2k'/'4k' as they imply specific upscaling models,
    // but use the Manual Model for standard '1k' generation.
    
    let activeModel: string = model; // Default to manual selection

    let imageConfig: any = {
      aspectRatio: aspectRatio,
    };

    if (resolution === '2k') {
      activeModel = 'gemini-3-pro-image-preview';
      imageConfig.imageSize = '2K';
    } else if (resolution === '4k') {
      activeModel = 'gemini-3-pro-image-preview';
      imageConfig.imageSize = '4K';
    } else {
        // Fallback or Manual Selection for 1K
        // If the user hasn't touched the manual setting (it might be default), ensure we use a valid model.
        if (!activeModel) activeModel = 'gemini-2.5-flash-image';
    }

    const response = await ai.models.generateContent({
      model: activeModel,
      contents: { parts: parts },
      config: {
        seed: seed,
        imageConfig: imageConfig,
      },
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString: string = part.inlineData.data;
          return { 
            url: `data:image/png;base64,${base64EncodeString}`,
            usedModel: activeModel
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error generating image for angle ${angle}:`, error);
    throw error;
  }
};
