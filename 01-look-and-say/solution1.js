'use strict';

/**
 * 하나의 개미수열 항을 읽어 다음 항을 만든다.
 *
 * 예: "1211" -> "111221"
 */
function makeNextSequence(sequence) {
  let count = 0;
  let number = 0;
  let result = '';

  for (let i = 0; i < sequence.length; i++) {
    // 앞뒤 숫자 비교
    if (sequence[i] === number) { // 앞뒤 숫자 동일
      count++;
    }
    else { // 앞뒤 숫자 다를때
      if (count > 0) {
        result += count + number;
      }
      number = sequence[i];
      count = 1;
    }
  }

  if (count > 0) {
    result += count + number;
  }

  return result;
}

/**
 * n번째 개미수열 항의 가운데 두 문자를 반환한다.
 */
function solution(n) {
  // n 범위 = 3 < n < 100
  if (!Number.isInteger(n) || n < 4 || n > 99) {
    throw new RangeError('n은 4 이상 99 이하의 정수여야 합니다.');
  }
  // 첫번째 항 L1 = 1로 시작
  let sequence = '1';
  for (let term = 1; term < n; term++) {
    sequence = makeNextSequence(sequence);
  }

  // 가운데 두자리수(m) 출력
  const middle = Math.floor(sequence.length / 2);
  return sequence.slice(middle - 1, middle + 1);
}

module.exports = { makeNextSequence, solution };
