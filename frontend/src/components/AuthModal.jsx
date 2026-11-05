// Componente Modal: Autenticación No Invasiva y Gestión Multi-Perfil
// Unificado con BrandLogo Rubber Hose y reglas Impeccable (cero dark-glow, cero nested-cards, contraste AA).

import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  Shield,
  Headphones,
  X,
  LogIn,
  UserPlus,
  CheckCircle2,
  MapPin
} from 'lucide-react';
import { BrandLogo } from './BrandLogo.jsx';

const USERS_STORAGE_KEY = 'tuxtla_registered_users';
const CURRENT_USER_KEY = 'tuxtla_current_user';

export const INITIAL_DEMO_USERS = [
  {
    id: 'demo-passenger',
    name: 'Pasajero Tuxtleco',
    email: 'pasajero@tuxtla.mx',
    password: '123',
    role: 'USER',
    personalPoints: { home: null, school: null, work: null },
    favoriteIds: []
  },
  {
    id: 'demo-support',
    name: 'Agente Soporte Vial',
    email: 'soporte@tuxtla.mx',
    password: '123',
    role: 'SUPPORT',
    personalPoints: { home: null, school: null, work: null },
    favoriteIds: []
  },
  {
    id: 'demo-admin',
    name: 'Administrador de Flota',
    email: 'admin@tuxtla.mx',
    password: '123',
    role: 'ADMIN',
    personalPoints: { home: null, school: null, work: null },
    favoriteIds: []
  }
];

export function loadStoredUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_USERS));
      return INITIAL_DEMO_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DEMO_USERS;
  } catch {
    return INITIAL_DEMO_USERS;
  }
}

export function saveStoredUsers(users) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn('Error al guardar usuarios en localStorage:', err);
  }
}

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
    console.warn('Error al guardar sesión en localStorage:', err);
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
  const [selectedRole, setSelectedRole] = useState('USER');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleRegister = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Ingresa tu nombre para crear la cuenta.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Ingresa un correo electrónico válido.');
      return;
    }
    if (!password.trim() || password.length < 3) {
      setErrorMessage('La contraseña debe tener al menos 3 caracteres.');
      return;
    }

    const currentUsers = loadStoredUsers();
    const existing = currentUsers.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (existing) {
      setErrorMessage('Ya existe una cuenta con este correo. Inicia sesión.');
      return;
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim(),
      role: selectedRole,
      personalPoints: { home: null, school: null, work: null },
      favoriteIds: []
    };

    const updatedUsers = [...currentUsers, newUser];
    saveStoredUsers(updatedUsers);
    saveCurrentSessionUser(newUser);

    setSuccessMessage(`Cuenta creada con éxito. Bienvenido, ${newUser.name}`);
    setTimeout(() => {
      if (onLoginSuccess) onLoginSuccess(newUser);
      onClose();
    }, 550);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Ingresa tu correo electrónico.');
      return;
    }

    const currentUsers = loadStoredUsers();
    const found = currentUsers.find(
      (u) =>
        u.email.toLowerCase() === email.trim().toLowerCase() &&
        u.password === password.trim()
    );

    if (!found) {
      setErrorMessage('Correo o contraseña incorrectos.');
      return;
    }

    saveCurrentSessionUser(found);
    setSuccessMessage(`Bienvenido de vuelta, ${found.name}`);
    setTimeout(() => {
      if (onLoginSuccess) onLoginSuccess(found);
      onClose();
    }, 420);
  };

  const handleQuickDemoLogin = (demoEmail) => {
    setErrorMessage('');
    const currentUsers = loadStoredUsers();
    let user = currentUsers.find((u) => u.email.toLowerCase() === demoEmail.toLowerCase());

    if (!user) {
      const fallback = INITIAL_DEMO_USERS.find((u) => u.email === demoEmail);
      if (fallback) {
        user = fallback;
        saveStoredUsers([...currentUsers, fallback]);
      }
    }

    if (user) {
      saveCurrentSessionUser(user);
      setSuccessMessage(`Sesión iniciada como ${user.name}`);
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess(user);
        onClose();
      }, 320);
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
                <span>Iniciar sesión</span>
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
                <span>Crear cuenta</span>
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
                  : 'Regístrate para personalizar tus recorridos diarios'}
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
                style={{
                  color: '#FCA5A5',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '12px'
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

            {/* Pestañas limpias con border-bottom (cero nested-cards) */}
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
                Registrarse
              </button>
            </div>

            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mode === 'register' && (
                <div>
                  <label htmlFor="auth-register-name" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '5px' }}>
                    Nombre completo
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A8B8CD' }} />
                    <input
                      type="text"
                      id="auth-register-name"
                      placeholder="Ej. Ana Gómez"
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
                <label htmlFor={mode === 'login' ? 'auth-login-email' : 'auth-register-email'} style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '5px' }}>
                  Correo electrónico
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A8B8CD' }} />
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
                <label htmlFor={mode === 'login' ? 'auth-login-password' : 'auth-register-password'} style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '5px' }}>
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#A8B8CD' }} />
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

              {mode === 'register' && (
                <div>
                  <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#CBD5E1', marginBottom: '6px' }}>
                    Tipo de perfil:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {[
                      { id: 'USER', label: 'Pasajero', Icon: User },
                      { id: 'SUPPORT', label: 'Soporte', Icon: Headphones },
                      { id: 'ADMIN', label: 'Admin', Icon: Shield }
                    ].map((p) => {
                      const isSel = selectedRole === p.id;
                      const RoleIcon = p.Icon;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedRole(p.id)}
                          style={{
                            padding: '8px 4px',
                            background: isSel ? 'rgba(2, 132, 199, 0.24)' : '#1E293B',
                            border: isSel ? '1px solid #38BDF8' : '1px solid var(--border-subtle)',
                            borderRadius: '8px',
                            color: isSel ? '#FFFFFF' : '#CBD5E1',
                            fontSize: '12px',
                            fontWeight: isSel ? 700 : 500,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                          }}
                        >
                          <RoleIcon size={13} />
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
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
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {mode === 'login' ? <LogIn size={15} /> : <UserPlus size={15} />}
                <span>{mode === 'login' ? 'Entrar a mi cuenta' : 'Crear cuenta gratis'}</span>
              </button>
            </form>

            {mode === 'login' && (
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '12px', color: '#CBD5E1', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  Acceso rápido de evaluación:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  <button
                    type="button"
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
                    Pasajero
                  </button>

                  <button
                    type="button"
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
