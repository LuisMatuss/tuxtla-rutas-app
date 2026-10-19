// Componente Modal: Autenticación No Invasiva, Gestión de Usuarios y Mensajes Contextuales
// Soporta registro de roles (Pasajero, Soporte, Admin) y persistencia de favoritos y puntos personales
import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Shield, Headphones, Bus, X, LogIn, UserPlus, Sparkles, CheckCircle2 } from 'lucide-react';

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
  initialMode = 'login', // 'login' | 'register' | 'prompt'
  promptMessage = null,
  onLoginSuccess
}) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'prompt'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('USER'); // 'USER' | 'SUPPORT' | 'ADMIN'
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Sincronizar modo inicial cuando se abre
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // Manejar Registro
  const handleRegister = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Por favor ingresa tu nombre');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor ingresa un correo electrónico válido');
      return;
    }
    if (!password.trim() || password.length < 3) {
      setErrorMessage('La contraseña debe tener al menos 3 caracteres');
      return;
    }

    const currentUsers = loadStoredUsers();
    const existing = currentUsers.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (existing) {
      setErrorMessage('Ya existe una cuenta con este correo. Inicia sesión en su lugar.');
      return;
    }

    // Al crear una cuenta nueva, personalPoints debe ser estrictamente { home: null, school: null, work: null } y favoriteIds []
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

    setSuccessMessage(`¡Cuenta creada con éxito! Bienvenido, ${newUser.name}`);
    setTimeout(() => {
      if (onLoginSuccess) onLoginSuccess(newUser);
      onClose();
    }, 600);
  };

  // Manejar Login
  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Por favor ingresa tu correo');
      return;
    }

    const currentUsers = loadStoredUsers();
    const found = currentUsers.find(
      (u) =>
        u.email.toLowerCase() === email.trim().toLowerCase() &&
        u.password === password.trim()
    );

    if (!found) {
      setErrorMessage('Correo o contraseña incorrectos');
      return;
    }

    saveCurrentSessionUser(found);
    setSuccessMessage(`¡Bienvenido de vuelta, ${found.name}!`);
    setTimeout(() => {
      if (onLoginSuccess) onLoginSuccess(found);
      onClose();
    }, 450);
  };

  // Login Rápido de Prueba (Demo)
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
      }, 350);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
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
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'background 0.2s ease'
          }}
          title="Cerrar"
        >
          <X size={18} />
        </button>

        {/* VISTA 1: AVISO CONTEXTUAL (PROMPT) */}
        {mode === 'prompt' ? (
          <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.35) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}
            >
              🔒
            </div>

            <div>
              <h2
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  color: '#ffffff',
                  margin: '0 0 8px 0',
                  lineHeight: '1.4'
                }}
              >
                {promptMessage || 'Acción requerida'}
              </h2>
              <p
                style={{
                  fontSize: '13px',
                  color: '#94a3b8',
                  lineHeight: '1.5',
                  margin: 0
                }}
              >
                Para guardar tus rutas favoritas, personalizar Casa/Escuela/Trabajo en el mapa o enviar reportes viales, accede a tu cuenta.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                id="btn-prompt-login"
                onClick={() => setMode('login')}
                style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
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
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  borderRadius: '10px',
                  color: '#f8fafc',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <UserPlus size={16} />
                <span>Registrarse</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '6px',
                  marginTop: '4px'
                }}
              >
                Continuar explorando como visitante
              </button>
            </div>
          </div>
        ) : (
          /* VISTA 2: FORMULARIO DE INICIAR SESIÓN / REGISTRO */
          <div style={{ padding: '24px' }}>
            {/* Cabecera */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #059669 0%, #2563eb 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Bus size={17} color="#ffffff" />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                </h2>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                {mode === 'login'
                  ? 'Accede a tus rutas favoritas y configuración personal'
                  : 'Regístrate para guardar Casa, Escuela y rutas en Tuxtla'}
              </p>
            </div>

            {/* Banner si viene de un aviso contextual */}
            {promptMessage && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '16px' }}>📍</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#fde047' }}>
                  {promptMessage}
                </span>
              </div>
            )}

            {/* Mensajes de error o éxito */}
            {errorMessage && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  marginBottom: '14px',
                  color: '#fca5a5',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                ⚠️ {errorMessage}
              </div>
            )}

            {successMessage && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  marginBottom: '14px',
                  color: '#6ee7b7',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle2 size={14} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Pestañas de Cambio Rápido */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '4px',
                background: 'rgba(15, 23, 42, 0.6)',
                padding: '4px',
                borderRadius: '10px',
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
                  background: mode === 'login' ? 'rgba(37, 99, 235, 0.3)' : 'transparent',
                  border: mode === 'login' ? '1px solid #3b82f6' : '1px solid transparent',
                  borderRadius: '8px',
                  color: mode === 'login' ? '#ffffff' : '#94a3b8',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
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
                  background: mode === 'register' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                  border: mode === 'register' ? '1px solid #10b981' : '1px solid transparent',
                  borderRadius: '8px',
                  color: mode === 'register' ? '#ffffff' : '#94a3b8',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Registrarse
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mode === 'register' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                    Nombre completo
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      id="auth-register-name"
                      placeholder="Ej. Ana Gómez"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '13px',
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                  Correo electrónico
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="email"
                    id={mode === 'login' ? 'auth-login-email' : 'auth-register-email'}
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '13px',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '5px' }}>
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="password"
                    id={mode === 'login' ? 'auth-login-password' : 'auth-register-password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '13px',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>

              {/* Selector de Perfil para Registro (Pasajero, Soporte, Admin) */}
              {mode === 'register' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                    Tipo de perfil (para pruebas del proyecto):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {[
                      { id: 'USER', label: 'Pasajero', icon: '👤', desc: 'Rutas y viajes' },
                      { id: 'SUPPORT', label: 'Soporte', icon: '🎧', desc: 'Alertas viales' },
                      { id: 'ADMIN', label: 'Admin', icon: '🛡️', desc: 'Control de flota' }
                    ].map((p) => {
                      const isSel = selectedRole === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedRole(p.id)}
                          style={{
                            padding: '8px 4px',
                            background: isSel ? 'rgba(37, 99, 235, 0.25)' : 'rgba(15, 23, 42, 0.5)',
                            border: isSel ? '1.5px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '8px',
                            color: isSel ? '#ffffff' : '#94a3b8',
                            fontSize: '12px',
                            fontWeight: isSel ? 700 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <span style={{ fontSize: '14px' }}>{p.icon}</span>
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Botón Principal de Envío */}
              <button
                type="submit"
                id={mode === 'login' ? 'auth-login-submit' : 'auth-register-submit'}
                style={{
                  marginTop: '8px',
                  padding: '11px',
                  background: mode === 'login'
                    ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                    : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                }}
              >
                {mode === 'login' ? <LogIn size={15} /> : <UserPlus size={15} />}
                <span>{mode === 'login' ? 'Entrar a mi cuenta' : 'Crear cuenta gratis'}</span>
              </button>
            </form>

            {/* Accesos rápidos de prueba (Demo) */}
            {mode === 'login' && (
              <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  ⚡ Acceso rápido para pruebas de evaluación:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('pasajero@tuxtla.mx')}
                    style={{
                      padding: '6px 4px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '6px',
                      color: '#6ee7b7',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    👤 Pasajero
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('soporte@tuxtla.mx')}
                    style={{
                      padding: '6px 4px',
                      background: 'rgba(37, 99, 235, 0.12)',
                      border: '1px solid rgba(37, 99, 235, 0.3)',
                      borderRadius: '6px',
                      color: '#93c5fd',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    🎧 Soporte
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('admin@tuxtla.mx')}
                    style={{
                      padding: '6px 4px',
                      background: 'rgba(2, 132, 199, 0.12)',
                      border: '1px solid rgba(2, 132, 199, 0.3)',
                      borderRadius: '6px',
                      color: '#7dd3fc',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    🛡️ Admin
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
