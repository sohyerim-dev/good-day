interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

export default function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-80 max-h-[70vh] flex flex-col mx-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-[18px] font-medium">{title}</h2>
          <button onClick={onClose} className="text-[24px] leading-none">
            &times;
          </button>
        </div>
        <p className="px-6 py-4 overflow-y-auto text-[14px] leading-relaxed whitespace-pre-line">
          {children}
        </p>
      </div>
    </div>
  );
}
