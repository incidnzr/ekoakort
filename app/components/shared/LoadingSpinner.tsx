interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({
  message = "Yükleniyor...",
}: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500"></div>
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
}
