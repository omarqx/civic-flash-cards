import { describe, it, expect } from 'vitest';
import { speakText, clipHash } from '../scripts/lib/spoken-text';

describe('speakText', () => {
  it('strips bracketed editorial notes (card 23)', () => {
    const input = 'Answers will vary by state. [Visit senate.gov. D.C. residents and residents of U.S. territories should answer that D.C. (or the territory) has no U.S. senators.]';
    expect(speakText(input)).toBe('Answers will vary by state.');
  });

  it('strips parenthetical duplications, keeping the spoken form (card 7)', () => {
    expect(speakText('Twenty-seven (27).')).toBe('Twenty-seven.');
  });

  it('strips leading parenthetical qualifiers (card 6)', () => {
    expect(speakText('(The basic) rights of Americans; (the basic) rights of people living in the United States.'))
      .toBe('rights of Americans. rights of people living in the United States.');
  });

  it('converts semicolon lists to sentence breaks (card 16)', () => {
    expect(speakText('Legislative, executive, and judicial; Congress, president, and the courts.'))
      .toBe('Legislative, executive, and judicial. Congress, president, and the courts.');
  });

  it('collapses whitespace and orphaned punctuation', () => {
    expect(speakText('The Senate and House (of Representatives).')).toBe('The Senate and House.');
  });
});

describe('clipHash', () => {
  it('is stable for identical input', () => {
    expect(clipHash('Twenty-seven.', 'af_heart')).toBe(clipHash('Twenty-seven.', 'af_heart'));
  });
  it('changes when text changes', () => {
    expect(clipHash('Twenty-seven.', 'af_heart')).not.toBe(clipHash('Twenty-eight.', 'af_heart'));
  });
  it('changes when voice changes', () => {
    expect(clipHash('Twenty-seven.', 'af_heart')).not.toBe(clipHash('Twenty-seven.', 'af_bella'));
  });
  it('is a 64-char hex sha256', () => {
    expect(clipHash('x', 'v')).toMatch(/^[0-9a-f]{64}$/);
  });
});
