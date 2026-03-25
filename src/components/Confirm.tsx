import { ReactNode } from "react";

interface ConfirmProps {
  msg: ReactNode;
  onOk: () => void;
  onCancel: () => void;
  okLabel?: string;
  okColor?: string;
}

export function Confirm({
  msg,
  onOk,
  onCancel,
  okLabel = "삭제",
  okColor = "var(--color-danger)",
}: ConfirmProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl mx-6 w-full overflow-hidden"
        style={{ maxWidth: "320px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-5 text-[14px] leading-[21px] text-text1 font-medium text-center">
          {msg}
        </div>
        <div className="flex border-t border-[#e5e8eb]">
          <button
            onClick={onCancel}
            className="flex-1 py-4 text-[15px] leading-[23px] text-text2 font-medium border-r border-[#e5e8eb]"
          >
            취소
          </button>
          <button
            onClick={onOk}
            className="flex-1 py-4 text-[15px] leading-[23px] font-semibold"
            style={{ color: okColor }}
          >
            {okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
