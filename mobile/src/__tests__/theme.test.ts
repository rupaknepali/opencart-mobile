type ThemeModule = typeof import('../theme');

// theme.ts keeps one mutable palette, so every test gets a fresh copy of the module.
function freshTheme(): ThemeModule {
  let mod!: ThemeModule;
  jest.isolateModules(() => {
    mod = require('../theme');
  });
  return mod;
}

describe('applyTheme', () => {
  it('keeps the defaults when the store sends nothing', () => {
    const { applyTheme, colors } = freshTheme();
    const before = { ...colors };
    applyTheme(undefined);
    applyTheme({ primary: '', secondary: '', tertiary: '' });
    expect(colors).toEqual(before);
  });

  it('ignores values that are not 6-digit hex colours', () => {
    const { applyTheme, colors } = freshTheme();
    applyTheme({ primary: 'red', secondary: '#fff', tertiary: 'javascript:alert(1)' });
    expect(colors.primary).toBe('#1f6feb');
    expect(colors.secondary).toBe('#e5484d');
    expect(colors.tertiary).toBe('#ffffff');
  });

  it('derives darker and lighter shades from the primary colour', () => {
    const { applyTheme, colors } = freshTheme();
    applyTheme({ primary: '#000000' });
    expect(colors.primary).toBe('#000000');
    expect(colors.primaryDark).toBe('#000000');
    expect(colors.primarySoft).toBe('#e6e6e6'); // 90 % towards white
  });

  it('picks readable text for light and dark colours', () => {
    const { applyTheme, colors } = freshTheme();
    applyTheme({ primary: '#ffcc00', secondary: '#0b3d91', tertiary: '#111827' });
    expect(colors.onPrimary).toBe('#1b1f24'); // dark text on yellow
    expect(colors.onSecondary).toBe('#ffffff'); // white text on navy
    expect(colors.onTertiary).toBe('#ffffff');
    expect(colors.tertiaryIsDark).toBe(true);
  });

  it('uses the store font colour for header text on a light header', () => {
    const { applyTheme, colors } = freshTheme();
    applyTheme({ text: '#3b2314', tertiary: '#ffffff' });
    expect(colors.text).toBe('#3b2314');
    expect(colors.onTertiary).toBe('#3b2314');
    expect(colors.textMuted).not.toBe(colors.text);
  });

  it('makes buttons follow primary unless the store sets button colours', () => {
    const first = freshTheme();
    first.applyTheme({ primary: '#ffcc00' });
    expect(first.colors.button).toBe('#ffcc00');
    expect(first.colors.onButton).toBe('#1b1f24');

    const second = freshTheme();
    second.applyTheme({ primary: '#ffcc00', button: '#111111', button_text: '#ffcc00' });
    expect(second.colors.button).toBe('#111111');
    expect(second.colors.onButton).toBe('#ffcc00');
  });

  it('never lets the store change the error colour', () => {
    const { applyTheme, colors } = freshTheme();
    applyTheme({ primary: '#00ff00', secondary: '#00ff00' });
    expect(colors.accent).toBe('#e5484d');
  });
});
