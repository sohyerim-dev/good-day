interface AlertModalProps {
  message: string;
  onClose: () => void;
  // 제공 시 "확인" 클릭에 실행됨. 배경 클릭은 여전히 onClose
  onConfirm?: () => void;
}
export default function AlertModal({ message, onClose, onConfirm }: AlertModalProps) {
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
            onClick={onConfirm ?? onClose}
            className="mt-6 w-full bg-[#EE6300] text-white rounded-xl py-3 font-semibold"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
