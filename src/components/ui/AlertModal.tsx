interface AlertModalProps {
  message: string;
  onClose: () => void;
}
export default function AlertModal({ message, onClose }: AlertModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl mx-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-8 text-center">
          <p className="text-[15px]">{message}</p>
          <button
            onClick={onClose}
            className="mt-6 w-full bg-[#EE6300] text-white rounded-xl py-3 font-semibold"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
