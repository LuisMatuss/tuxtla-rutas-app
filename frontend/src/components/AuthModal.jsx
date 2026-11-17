// Componente Modal: Autenticación Persistente 100% en PostgreSQL (tuxtla_rutas_db)
// Cero usuarios mock en memoria ni en localStorage: única fuente de verdad vía /api/auth.

import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  X,
  LogIn,
  UserPlus,
  CheckCircle2,
  MapPin
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.jsx';
import { apiClient } from '../api/client.js';

const CURRENT_USER_KEY = 'tuxtla_current_user';

export function loadCurrentSessionUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCurrentSessionUser(user) {
  try {
    if (!user) {
      localStorage.removeItem(CURRENT_USER_KEY);
    } else {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    }
  } catch (err) {
    console.warn('Error al guardar sesión activa:', err);
  }
}

export function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
  promptMessage = null,
  onLoginSuccess
}) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage('');
      setSuccessMessage('');
      setSubmitting(false);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const finalizeSession = (userObj, welcomeText) => {
    const normalizedUser = {
      ...userObj,
      favoriteRoutes: Array.isArray(userObj.favoriteRoutes)
        ? userObj.favoriteRoutes
        : Array.isArray(userObj.favoriteIds)
        ? userObj.favoriteIds
        : [],
      favoriteIds: Array.isArray(userObj.favoriteIds)
        ? userObj.favoriteIds
        : Array.isArray(userObj.favoriteRoutes)
        ? userObj.favoriteRoutes
        : [],
      personalPoints: userObj.personalPoints || []
    };

    saveCurrentSessionUser(normalizedUser);
    setSuccessMessage(welcomeText);
    setTimeout(() => {
      if (onLoginSuccess) onLoginSuccess(normalizedUser);
      onClose();
    }, 380);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanName) {
      setErrorMessage('Ingresa tu nombre para crear la cuenta.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Ingresa un correo electrónico válido.');
      return;
    }
    if (!cleanPassword || cleanPassword.length < 3) {
      setErrorMessage('La contraseña debe tener al menos 3 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.registerUser({
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword
      });
      finalizeSession(res.user, `Cuenta creada en PostgreSQL. Bienvenido, ${res.user.name}`);
    } catch (err) {
      setErrorMessage(err.message || 'Este correo ya está registrado.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setErrorMessage('Ingresa tu correo electrónico.');
      return;
    }
    if (!cleanPassword) {
      setErrorMessage('Ingresa tu contraseña.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.loginUser({
        email: cleanEmail,
        password: cleanPassword
      });
      finalizeSession(res.user, `Bienvenido de vuelta, ${res.user.name}`);
    } catch (err) {
      setErrorMessage(err.message || 'Credenciales incorrectas.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail) => {
    setErrorMessage('');
    setSuccessMessage('');
    setSubmitting(true);

    try {
      const res = await apiClient.loginUser({
        email: demoEmail,
        password: '123'
      });
      finalizeSession(res.user, `Sesión iniciada como ${res.user.name}`);
    } catch (err) {
      setErrorMessage(err.message || 'Error al autenticar cuenta contra PostgreSQL.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(8px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: '100%',
          maxWidth: '430px',
          backgroundColor: '#0F172A',
          border: '1px solid var(--border-strong)',
          borderRadius: '14px',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón de cierre */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ventana"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#1E293B',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#CBD5E1',
            cursor: 'pointer'
          }}
        >
          <X size={17} />
        </button>

        {mode === 'prompt' ? (
          <div style={{ padding: '26px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <BrandLogo size={52} alt="Emblema Tuxtla Rutas" />

            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  margin: '0 0 8px 0',
                  lineHeight: 1.3
                }}
              >
                {promptMessage || 'Inicia sesión para continuar'}
              </h2>
              <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.5, margin: 0 }}>
                Guarda tus rutas favoritas, fija Casa, Escuela o Trabajo en el mapa y envía reportes viales.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                id="btn-prompt-login"
                onClick={() => setMode('login')}
                style={{
                  padding: '11px 16px',
                  background: '#F59E0B',
                  border: '1px solid #FDE68A',
                  borderRadius: '10px',
                  color: '#0F172A',
                  fontSize: '14px',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <LogIn size={16} />
                <span>Iniciar Sesión</span>
              </button>

              <button
                type="button"
                id="btn-prompt-register"
                onClick={() => setMode('register')}
                style={{
                  padding: '11px 16px',
                  background: '#1E293B',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '10px',
                  color: '#F8FAFC',
                  fontSize: '14px',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <UserPlus size={16} />
                <span>Crear Cuenta</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#A8B8CD',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  padding: '6px'
                }}
              >
                Continuar explorando como visitante
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '24px' }}>
            {/* Cabecera con BrandLogo */}
            <div style={{ marginBottom: '16px', paddingRight: '36px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <BrandLogo size={36} alt="Logo Tuxtla Rutas" />
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '18px',
                    fontWeight: 800,
                    color: '#F8FAFC',
                    margin: 0
                  }}
                >
                  {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                </h2>
              </div>
              <p style={{ fontSize: '12px', color: '#A8B8CD', margin: 0 }}>
                {mode === 'login'
                  ? 'Accede a tus rutas favoritas y puntos frecuentes en Tuxtla'
                  : 'Regístrate en PostgreSQL para personalizar tus recorridos diarios'}
              </p>
            </div>

            {promptMessage && (
              <div
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '10px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#FDE68A'
                }}
              >
                <MapPin size={14} color="#F59E0B" />
                <span>{promptMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                style={{
                  color: '#FCA5A5',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '12px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.14)',
                  border: '1px solid rgba(239, 68, 68, 0.35)'
                }}
              >
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div
                style={{
                  color: '#6EE7B7',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle2 size={14} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Pestañas limpias: "Iniciar Sesión" y "Crear Cuenta" */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                borderBottom: '1px solid var(--border-subtle)',
                marginBottom: '16px'
              }}
            >
              <button
                type="button"
                id="auth-tab-login"
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                }}
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: mode === 'login' ? '2px solid #F59E0B' : '2px solid transparent',
                  color: mode === 'login' ? '#FFFFFF' : '#A8B8CD',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: 'pointer'
                }}
              >
                Iniciar Sesión
              </button>

              <button
                type="button"
                id="auth-tab-register"
                onClick={() => {
                  setMode('register');
                  setErrorMessage('');
                }}
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: mode === 'register' ? '2px solid #10B981' : '2px solid transparent',
                  color: mode === 'register' ? '#FFFFFF' : '#A8B8CD',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: 'pointer'
                }}
              >
                Crear Cuenta
              </button>
            </div>

            <form
              onSubmit={mode === 'login' ? handleLogin : handleRegister}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              {mode === 'register' && (
                <div>
                  <label
                    htmlFor="auth-register-name"
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#CBD5E1',
                      marginBottom: '5px'
                    }}
                  >
                    Nombre
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={15}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#A8B8CD'
                      }}
                    />
                    <input
                      type="text"
                      id="auth-register-name"
                      placeholder="Ej. Luis Matus"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 36px',
                        background: '#1E293B',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor={mode === 'login' ? 'auth-login-email' : 'auth-register-email'}
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#CBD5E1',
                    marginBottom: '5px'
                  }}
                >
                  Correo electrónico
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#A8B8CD'
                    }}
                  />
                  <input
                    type="email"
                    id={mode === 'login' ? 'auth-login-email' : 'auth-register-email'}
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 36px',
                      background: '#1E293B',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={mode === 'login' ? 'auth-login-password' : 'auth-register-password'}
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#CBD5E1',
                    marginBottom: '5px'
                  }}
                >
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#A8B8CD'
                    }}
                  />
                  <input
                    type="password"
                    id={mode === 'login' ? 'auth-login-password' : 'auth-register-password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px 9px 36px',
                      background: '#1E293B',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                id={mode === 'login' ? 'auth-login-submit' : 'auth-register-submit'}
                style={{
                  marginTop: '6px',
                  padding: '10px',
                  background: mode === 'login' ? '#F59E0B' : '#065F46',
                  border: mode === 'login' ? '1px solid #FDE68A' : '1px solid #10B981',
                  borderRadius: '8px',
                  color: mode === 'login' ? '#0F172A' : '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity: submitting ? 0.75 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {mode === 'login' ? <LogIn size={15} /> : <UserPlus size={15} />}
                <span>
                  {submitting
                    ? 'Verificando en PostgreSQL...'
                    : mode === 'login'
                    ? 'Iniciar Sesión'
                    : 'Crear Cuenta'}
                </span>
              </button>
            </form>

            {/* Botones de Acceso Rápido para Evaluación autenticados contra PostgreSQL */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
              <span
                style={{
                  fontSize: '12px',
                  color: '#CBD5E1',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: '8px'
                }}
              >
                Acceso Rápido para Evaluación:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                <button
                  type="button"
                  id="btn-demo-passenger"
                  disabled={submitting}
                  onClick={() => handleQuickDemoLogin('pasajero@tuxtla.mx')}
                  style={{
                    padding: '6px 4px',
                    background: 'rgba(13, 148, 104, 0.18)',
                    border: '1px solid rgba(16, 185, 129, 0.42)',
                    borderRadius: '6px',
                    color: '#6EE7B7',
                    fontSize: '12px',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  Demo Pasajero
                </button>

                <button
                  type="button"
                  id="btn-demo-support"
                  disabled={submitting}
                  onClick={() => handleQuickDemoLogin('soporte@tuxtla.mx')}
                  style={{
                    padding: '6px 4px',
                    background: 'rgba(2, 132, 199, 0.18)',
                    border: '1px solid rgba(56, 189, 248, 0.42)',
                    borderRadius: '6px',
                    color: '#7DD3FC',
                    fontSize: '12px',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  Soporte
                </button>

                <button
                  type="button"
                  id="btn-demo-admin"
                  disabled={submitting}
                  onClick={() => handleQuickDemoLogin('admin@tuxtla.mx')}
                  style={{
                    padding: '6px 4px',
                    background: 'rgba(245, 158, 11, 0.18)',
                    border: '1px solid rgba(245, 158, 11, 0.45)',
                    borderRadius: '6px',
                    color: '#FDE68A',
                    fontSize: '12px',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  Admin
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
