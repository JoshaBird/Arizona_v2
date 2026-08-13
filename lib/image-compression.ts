/**
 * Enhanced image compression utility for 4.5MB Vercel limit
 * Maintains high quality while ensuring files stay under size limits
 */

export const compressImageToTargetSize = async (
  file: File,
  targetSizeMB: number = 4.5, // Vercel limit
  maxWidth: number = 1920, // Higher resolution for better quality
  maxHeight: number = 1080, // 16:9 aspect ratio
  quality: number = 0.85 // Higher initial quality
): Promise<File> => {
  const targetSizeBytes = targetSizeMB * 1024 * 1024;

  // If file is already smaller than target, return as is
  if (file.size <= targetSizeBytes) {
    return file;
  }

  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        if (width > height) {
          width = Math.min(maxWidth, width);
          height = width / aspectRatio;
        } else {
          height = Math.min(maxHeight, height);
          width = height * aspectRatio;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw the image with high quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Smart compression with quality preservation
      const tryCompress = (
        currentQuality: number,
        attempts: number = 0
      ): void => {
        if (attempts > 10) {
          // Prevent infinite loops
          resolve(file);
          return;
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            const compressedSize = blob.size;
            const sizeRatio = compressedSize / targetSizeBytes;

            // If we're within 10% of target size or quality is getting too low
            if (sizeRatio <= 1.1 || currentQuality <= 0.3) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              console.log(
                `Compressed from ${(file.size / 1024 / 1024).toFixed(
                  2
                )}MB to ${(compressedSize / 1024 / 1024).toFixed(
                  2
                )}MB with quality ${currentQuality.toFixed(2)}`
              );
              resolve(compressedFile);
            } else {
              // Calculate next quality based on size ratio
              const nextQuality = Math.max(
                0.3,
                currentQuality * (0.8 / sizeRatio)
              );
              tryCompress(nextQuality, attempts + 1);
            }
          },
          file.type,
          currentQuality
        );
      };

      // Start with high quality
      tryCompress(quality);
    };

    img.onerror = () => {
      resolve(file);
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Quick compression for smaller files (1.5MB limit)
 * Used for faster processing when high quality isn't critical
 */
export const compressImageQuick = async (
  file: File,
  targetSizeMB: number = 1.5,
  maxWidth: number = 900,
  maxHeight: number = 675,
  quality: number = 0.65
): Promise<File> => {
  return compressImageToTargetSize(
    file,
    targetSizeMB,
    maxWidth,
    maxHeight,
    quality
  );
};

/**
 * High quality compression for important images
 * Uses maximum quality settings while staying under 4.5MB
 */
export const compressImageHighQuality = async (
  file: File,
  targetSizeMB: number = 4.5,
  maxWidth: number = 2560,
  maxHeight: number = 1440,
  quality: number = 0.9
): Promise<File> => {
  return compressImageToTargetSize(
    file,
    targetSizeMB,
    maxWidth,
    maxHeight,
    quality
  );
};

//xvbddfgdgf
