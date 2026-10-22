import React, { useState } from 'react';
import './NicknameModal.css';

export default function NicknameModal({
  currentNickname = '',
  isFirst = false,
  error = '',
  onSubmit,
  onClose,
}) {
  const [value, setValue] = useState(currentNickname);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value.trim() || submitting) return;
    setSubmitting(true);
    try { await onSubmit(value.trim()); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose || undefined}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title neon-cyan">
          {isFirst ? 'ENTER YOUR NAME' : 'CHANGE NAME'}
        </h2>
        <p className="modal-desc">
          {isFirst
            ? '닉네임을 입력하면 바로 시작합니다. 이미 사용 중인 닉네임은 사용할 수 없습니다.'
            : '새로운 닉네임을 입력하세요.'}
        </p>

        <form onSubmit={handleSubmit} className="modal-form">
          <input
            className="input-neon"
            type="text"
            aria-label="닉네임"
            autoComplete="username"
            placeholder="닉네임 (최대 12자)"
            maxLength={12}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          {error && <p className="modal-error neon-pink">{error}</p>}
          <div className="modal-actions">
            <button type="submit" className="btn btn-cyan" disabled={submitting || !value.trim()}>
              {submitting ? '처리 중...' : '확인'}
            </button>
            {onClose && (
              <button type="button" className="btn btn-pink" onClick={onClose}>
                취소
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
