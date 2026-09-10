sed -i '25 a\
\
export const formatName = (fullName: string) => {\
  if (!fullName) return "";\
  const parts = fullName.trim().split(/\\s+/);\
  if (parts.length >= 3) {\
    return `${parts[0]} ${parts[2]}`;\
  }\
  if (parts.length === 2) {\
    return `${parts[0]} ${parts[1]}`;\
  }\
  return fullName;\
};' src/components/MainView.tsx
