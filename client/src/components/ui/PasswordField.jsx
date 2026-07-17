import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

function PasswordField({ autoComplete, onChange, placeholder = "Password", value }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        autoComplete={autoComplete}
        onChange={onChange}
        placeholder={placeholder}
        type={visible ? "text" : "password"}
        value={value}
      />
      <button
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export default PasswordField;
