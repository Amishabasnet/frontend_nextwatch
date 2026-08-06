import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./BackButton.css";

export default function BackButton({ fallback = "/dashboard", label = "Back", className = "" }) {
  const navigate = useNavigate();

  const handleClick = () => {
    const hasAppHistory = window.history.state && window.history.state.idx > 0;
    if (hasAppHistory) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button type="button" className={`bb-back-btn ${className}`} onClick={handleClick}>
      <ArrowLeft size={15} strokeWidth={2} />
      {label}
    </button>
  );
}
