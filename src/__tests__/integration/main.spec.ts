import execa from 'execa';
import { resolve } from 'path';

const bin = resolve(__dirname, './bin.js');

describe('tml', () => {
  it('should display the help contents', async () => {
    const { stdout } = await execa(bin, ['--help']);

    expect(stdout).toContain('Usage: tml [options]');
  });

  it('should parse the tml file', async () => {
    const { stdout } = await execa(bin, [
      resolve(__dirname, '../subjects/Order.tml'),
    ]);

    console.log(stdout);
  });
});
