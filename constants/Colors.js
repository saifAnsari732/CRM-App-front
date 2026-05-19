const tintColorLight = '#008080';
const tintColorDark = '#4db6ac';

export default {
  light: {
    text: '#1e293b',
    background: '#ffffff',
    tint: tintColorLight,
    tabIconDefault: '#94a3b8',
    tabIconSelected: tintColorLight,
    primary: '#008080', // Teal
    secondary: '#64748b',
    surface: '#f8fafc',
    error: '#ef4444',
    border: '#e2e8f0',
  },
  dark: {
    text: '#f8fafc',
    background: '#002020', // Darker Teal/Black
    tint: tintColorDark,
    tabIconDefault: '#64748b',
    tabIconSelected: tintColorDark,
    primary: '#008080',
    secondary: '#94a3b8',
    surface: '#003030',
    error: '#f87171',
    border: '#004d40',
  },
};
