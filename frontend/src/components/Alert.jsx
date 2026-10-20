import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export default function Alert({ type = 'info', title, message, children }) {
  let icon = <Info size={20} />;
  let className = 'alert alert-info';

  if (type === 'success') {
    icon = <CheckCircle size={20} />;
    className = 'alert alert-success';
  } else if (type === 'error' || type === 'danger') {
    icon = <AlertCircle size={20} />;
    className = 'alert alert-error';
  } else if (type === 'warning') {
    icon = <AlertTriangle size={20} />;
    className = 'alert alert-warning';
  }

  return (
    <div className={className}>
      <div style={{ flexShrink: 0, marginTop: '2px' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 600, marginBottom: '2px' }}>{title}</div>}
        <div>{message || children}</div>
      </div>
    </div>
  );
}
