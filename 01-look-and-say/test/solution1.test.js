const { makeNextSequence, solution } = require('../solution1');

describe('makeNextSequence', () => {
  test('다음 항 생성: 1 → 11', () => {
    expect(makeNextSequence('1')).toBe('11');
  });

  test('다음 항 생성: 11 → 21', () => {
    expect(makeNextSequence('11')).toBe('21');
  });

  test('다음 항 생성: 21 → 1211', () => {
    expect(makeNextSequence('21')).toBe('1211');
  });

  test('다음 항 생성: 1211 → 111221', () => {
    expect(makeNextSequence('1211')).toBe('111221');
  });
});

describe('solution', () => {
  test('4번째 항의 가운데 두 문자: 21', () => {
    expect(solution(4)).toBe('21');
  });

  test('5번째 항의 가운데 두 문자: 12', () => {
    expect(solution(5)).toBe('12');
  });

  test('30번째 항의 가운데 두 문자: 21', () => {
    expect(solution(30)).toBe('21');
  });

  test('50번째 항의 가운데 두 문자: 21', () => {
    expect(solution(50)).toBe('21');
  });

  test('60번째 항의 가운데 두 문자: 11', () => {
    expect(solution(60)).toBe('11');
  });

  // 주의: solution.js와 동일한 알고리즘이라 n=70에서도 똑같이
  // JS heap out of memory로 프로세스가 죽는다(효율성 문제는 아직 미해결).
  test('70번째 항의 반환값은 1, 2, 3으로 구성된 두 문자다', () => {
    expect(solution(70)).toMatch(/^[123]{2}$/);
  });
});
