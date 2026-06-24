const LoadingSpinner = ({ text = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-red-600" />

      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
};

export default LoadingSpinner;