import { supabase } from "@/integrations/supabase/client";

export const generateEnhancedLogo = async (): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-logo');
    
    if (error) throw error;
    
    if (!data?.imageUrl) {
      throw new Error('No image URL returned');
    }
    
    return data.imageUrl;
  } catch (error) {
    console.error('Error generating logo:', error);
    throw error;
  }
};

export const downloadLogoAsFile = async (base64Data: string): Promise<File> => {
  const response = await fetch(base64Data);
  const blob = await response.blob();
  return new File([blob], 'vistari-logo-enhanced.png', { type: 'image/png' });
};
