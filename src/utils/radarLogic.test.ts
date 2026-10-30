import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBlynkStatus,
  isWatchdogTimedOut,
  classifyProximityZone,
  detectKineticSpike,
  getAudioProfileConfig,
  calculateSpeedDelta,
  formatSpeedDelta,
} from './radarLogic';

test('parseBlynkStatus correctly handles string and numeric Blynk virtual pin V2 values', () => {
  assert.equal(parseBlynkStatus('NORMAL'), 'NORMAL');
  assert.equal(parseBlynkStatus('0'), 'NORMAL');
  assert.equal(parseBlynkStatus(0), 'NORMAL');
  assert.equal(parseBlynkStatus(''), 'NORMAL');
  assert.equal(parseBlynkStatus(null), 'NORMAL');

  // Verification states
  assert.equal(parseBlynkStatus('VERIFYING FALL...'), 'VERIFYING');
  assert.equal(parseBlynkStatus('VERIFYING'), 'VERIFYING');
  assert.equal(parseBlynkStatus('1'), 'VERIFYING');
  assert.equal(parseBlynkStatus(1), 'VERIFYING');

  // Fall detected states
  assert.equal(parseBlynkStatus('FALL DETECTED!'), 'FALL_DETECTED');
  assert.equal(parseBlynkStatus('FALL DETECTED'), 'FALL_DETECTED');
  assert.equal(parseBlynkStatus('2'), 'FALL_DETECTED');
  assert.equal(parseBlynkStatus(2), 'FALL_DETECTED');
  assert.equal(parseBlynkStatus('EMERGENCY'), 'FALL_DETECTED');
});

test('isWatchdogTimedOut accurately detects hardware packet drops beyond 5 seconds', () => {
  const now = 100000;
  // Packet received 2 seconds ago -> should NOT timeout
  assert.equal(isWatchdogTimedOut(now - 2000, now, 5000), false);

  // Packet received 4.9 seconds ago -> should NOT timeout
  assert.equal(isWatchdogTimedOut(now - 4900, now, 5000), false);

  // Packet received 5.1 seconds ago -> should TIMEOUT
  assert.equal(isWatchdogTimedOut(now - 5100, now, 5000), true);

  // Packet received 10 seconds ago -> should TIMEOUT
  assert.equal(isWatchdogTimedOut(now - 10000, now, 5000), true);

  // Missing timestamp -> timeout
  assert.equal(isWatchdogTimedOut(0, now, 5000), true);
});

test('classifyProximityZone maps distances to Near, Mid, Far, and Out of Range', () => {
  assert.equal(classifyProximityZone(0.8).zone, 'Near');
  assert.equal(classifyProximityZone(1.4).zone, 'Near');
  assert.equal(classifyProximityZone(2.5).zone, 'Mid');
  assert.equal(classifyProximityZone(4.2).zone, 'Far');
  assert.equal(classifyProximityZone(7.5).zone, 'Out of Range');
  assert.equal(classifyProximityZone(0).zone, 'Out of Range');
});

test('detectKineticSpike identifies velocity surges over threshold', () => {
  assert.equal(detectKineticSpike(0.5, 1.8), false);
  assert.equal(detectKineticSpike(1.2, 1.8), false);
  assert.equal(detectKineticSpike(1.85, 1.8), true);
  assert.equal(detectKineticSpike(2.8, 1.8), true);
  // Negative velocities (movement towards sensor during impact)
  assert.equal(detectKineticSpike(-2.4, 1.8), true);
});

test('getAudioProfileConfig computes frequencies shifted by pitch factor', () => {
  const classicNormal = getAudioProfileConfig('classic', 1.0);
  assert.equal(classicNormal.waveType, 'square');
  assert.equal(classicNormal.tickFreq, 680);

  const classicShifted = getAudioProfileConfig('classic', 1.5);
  assert.equal(classicShifted.tickFreq, 680 * 1.5);

  const chimes = getAudioProfileConfig('chimes', 1.0);
  assert.equal(chimes.waveType, 'sine');
  assert.equal(chimes.chimeFrequencies.length, 4);
  assert.equal(Math.round(chimes.chimeFrequencies[0]), 523);
});

test('calculateSpeedDelta accurately computes acceleration and deceleration', () => {
  assert.equal(calculateSpeedDelta(0.85, 0.40), 0.45);
  assert.equal(calculateSpeedDelta(0.40, 0.85), -0.45);
  assert.equal(calculateSpeedDelta(1.20, 1.20), 0.00);
  assert.equal(calculateSpeedDelta(3.25, 0.65), 2.60);
});

test('formatSpeedDelta outputs sign and units', () => {
  assert.equal(formatSpeedDelta(0.45), '+0.45 m/s');
  assert.equal(formatSpeedDelta(-0.62), '-0.62 m/s');
  assert.equal(formatSpeedDelta(0.00), '0.00 m/s');
});

