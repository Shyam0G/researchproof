import React from 'react';

export default function Badge({ status, text }) {
  const s = (status || '').toLowerCase();
  const label = text || status;

  let className = 'badge badge-neutral';

  if (['completed', 'accepted', 'approved', 'healthy', 'active'].includes(s)) {
    className = 'badge badge-success';
  } else if (['revision_required', 'pending', 'evaluating', 'in_progress', 'draft'].includes(s)) {
    className = 'badge badge-warning';
  } else if (['cancelled', 'rejected', 'delayed', 'error'].includes(s)) {
    className = 'badge badge-danger';
  } else if (['published', 'open'].includes(s)) {
    className = 'badge badge-primary';
  }

  return (
    <span className={className}>
      {label}
    </span>
  );
}
