import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';

export const QuestionImage = ({ id, fallbackText, images }: { id: string; fallbackText?: string, images?: string[] }) => {
  const [errorUrls, setErrorUrls] = useState<Record<string, boolean>>({});
  const [firebaseImages, setFirebaseImages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!images || images.length === 0) return;
    
    images.forEach(async (img) => {
      // If NOT a local path and we haven't fetched it
      if (!img.startsWith('/') && !img.startsWith('data:') && !firebaseImages[img] && !errorUrls[img]) {
        try {
          const docRef = doc(db, 'images', img);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setFirebaseImages(prev => ({ ...prev, [img]: docSnap.data().content }));
          }
        } catch (e) {
          try { handleFirestoreError(e, OperationType.GET, 'images'); } catch(err) {}
        }
      }
    });
  }, [images]);

  if (images && images.length > 0) {
    return (
      <div className="my-6 flex flex-col gap-4">
        {images.map((img, idx) => {
          let srcPath = img;
          if (img.startsWith('/')) {
            srcPath = img;
          } else if (img.startsWith('data:')) {
            srcPath = img;
          } else if (firebaseImages[img]) {
            srcPath = firebaseImages[img];
          } else {
            srcPath = `/${img}`; // Fallback to public/
          }

          if (errorUrls[srcPath]) return null;

          return (
            <div key={idx} className="relative flex-1 bg-zinc-50 border-4 border-dashed border-zinc-200 rounded-2xl flex items-center justify-center overflow-hidden p-2 min-h-[4rem]">
              {!firebaseImages[img] && !img.startsWith('/') && !img.startsWith('data:') && (
                 <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">Loading...</div>
              )}
              <img
                src={srcPath}
                alt={`题目配图 ${idx + 1}`}
                className="max-w-full h-auto max-h-[400px] object-contain rounded-lg shadow-sm relative z-10"
                onError={() => setErrorUrls(prev => ({ ...prev, [srcPath]: true }))}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // 默认兼容原来的 id.png 逻辑
  if (errorUrls[`/images/${id}.png`]) {
    return null;
  }

  return (
    <div className="my-6 relative flex-1 bg-zinc-50 border-4 border-dashed border-zinc-200 rounded-2xl flex items-center justify-center overflow-hidden p-2 min-h-[4rem]">
      <img
        src={`/images/${id}.png`}
        alt={`题目 ${id} 的配图`}
        onError={() => setErrorUrls(prev => ({ ...prev, [`/images/${id}.png`]: true }))}
        className="max-w-full h-auto max-h-[400px] object-contain rounded-lg shadow-sm relative z-10"
      />
      <span className="absolute bottom-2 right-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hidden sm:block">Visual Aid: /images/{id}.png</span>
    </div>
  );
};
