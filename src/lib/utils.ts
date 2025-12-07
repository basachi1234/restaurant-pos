import { supabase } from "@/lib/supabase";

export const resizeAndUploadImage = async (file: File, bucket: string = 'menus'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h *= MAX/w; w = MAX; } } 
        else { if (h > MAX) { w *= MAX/h; h = MAX; } }
        
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            const fileExt = "jpg";
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const { error } = await supabase.storage.from(bucket).upload(fileName, blob, { contentType: 'image/jpeg' });
            if (error) reject(error);
            else {
              const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
              resolve(data.publicUrl);
            }
          } else reject(new Error("Resize failed"));
        }, 'image/jpeg', 0.8);
      };
    };
    reader.onerror = reject;
  });
};

export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};