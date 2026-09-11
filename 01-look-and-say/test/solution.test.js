const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeNextSequence, solution } = require('../solution');

test('다음 항 생성: 1 → 11', () => {
  assert.equal(makeNextSequence('1'), '11');
});

test('다음 항 생성: 11 → 21', () => {
  assert.equal(makeNextSequence('11'), '21');
});

test('다음 항 생성: 21 → 1211', () => {
  assert.equal(makeNextSequence('21'), '1211');
});

test('다음 항 생성: 1211 → 111221', () => {
  assert.equal(makeNextSequence('1211'), '111221');
});

test('4번째 항의 가운데 두 문자: 21', () => {
  assert.equal(solution(4), '21');
});

test('5번째 항의 가운데 두 문자: 12', () => {
  assert.equal(solution(5), '12');
});

test('30번째 항의 가운데 두 문자: 21', () => {
  assert.equal(solution(30), '21');
});

test('50번째 항의 가운데 두 문자: 21', () => {
  assert.equal(solution(50), '21');
});

test('60번째 항의 가운데 두 문자: 11', () => {
  assert.equal(solution(60), '11');
});

test('70번째 항의 반환값은 1, 2, 3으로 구성된 두 문자다', () => {
  assert.match(solution(70), /^[123]{2}$/);
});
