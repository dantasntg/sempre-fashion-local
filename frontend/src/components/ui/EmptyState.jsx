import React from 'react';

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {Icon && (
        <div className="w-11 h-11 rounded-full bg-surface-subtle flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-ink-faint" strokeWidth={1.5} />
        </div>
      )}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="text-sm text-ink-faint mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
