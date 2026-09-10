sed -i '4 a\
\
const AutoResizeTextarea = ({ value, onChange, className, minHeight = 40 }: { value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, className?: string, minHeight?: number }) => {\
  const textareaRef = useRef<HTMLTextAreaElement>(null);\
  useEffect(() => {\
    if (textareaRef.current) {\
      textareaRef.current.style.height = "auto";\
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, minHeight)}px`;\
    }\
  }, [value, minHeight]);\
  return (\
    <textarea\
      ref={textareaRef}\
      value={value}\
      onChange={onChange}\
      className={className}\
      rows={1}\
      style={{ minHeight: `${minHeight}px`, resize: "none", overflow: "hidden" }}\
    />\
  );\
};' src/components/MainView.tsx
