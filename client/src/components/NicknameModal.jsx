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
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value.trim() || submitting) return;
    setSubmitting(true);
    try { await onSubmit(value.trim(), password); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose || undefined}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title neon-cyan">
          {isFirst ? 'PLAYER LOGIN' : 'CHANGE NAME'}
        </h2>
        <p className="modal-desc">
          {isFirst
            ? '닉네임과 비밀번호를 입력하세요. 처음 쓰는 닉네임은 새 계정으로 등록됩니다.'
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
          {isFirst && (
            <input
              className="input-neon"
              type="password"
              aria-label="비밀번호"
              placeholder="비밀번호 (8자 이상)"
              autoComplete="current-password"
              minLength={8}
              maxLength={128}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          {error && <p className="modal-error neon-pink">{error}</p>}
          <div className="modal-actions">
            <button type="submit" className="btn btn-cyan" disabled={submitting || !value.trim() || (isFirst && password.length < 8)}>
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
