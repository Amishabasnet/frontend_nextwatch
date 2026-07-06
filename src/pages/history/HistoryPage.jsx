import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { LogOut, Loader2 } from "lucide-react";
import { getHistory } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import "./HistoryPage.css";

function HistoryPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await getHistory();
        setHistory(Array.isArray(data) ? data : data?.history || []);
      } catch (error) {
        toast.error("Failed to load history");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="history-page loading-container">
        <Loader2 className="spinner" />
      </div>
    );
  }

  return (
    <div className="history-page">
      <div className="history-header">
        <h1>Watch History</h1>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          Logout
        </button>
      </div>

      <div className="history-content">
        {history.length === 0 ? (
          <div className="empty-state">
            <p>No watch history yet</p>
          </div>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <div key={item.id || item._id} className="history-item">
                <h3>{item.title || "Untitled"}</h3>
                <p>{item.watchedAt || "Date unknown"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HistoryPage;
