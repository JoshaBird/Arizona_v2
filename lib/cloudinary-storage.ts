// Cloudinary storage approach (alternative to Supabase)
// This provides better image optimization and CDN delivery

interface CloudinaryResponse {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

export async function uploadToCloudinary(
  file: File,
  folder: string = "oak-iron-work"
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", process.env.CLOUDINARY_UPLOAD_PRESET || "");
  formData.append("folder", folder);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Cloudinary upload failed");
    }

    const data: CloudinaryResponse = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
}

// Usage example:
// const imageUrl = await uploadToCloudinary(file, 'submissions');
// Store imageUrl in MongoDB images array
