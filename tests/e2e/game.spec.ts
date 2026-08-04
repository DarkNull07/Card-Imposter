import { expect, test } from '@playwright/test';

test.describe('CARD IMPOSTER - E2E Multiplayer Flow', () => {
  test('Full 4-player match flow and mid-game spectator join', async ({ browser }) => {
    // Create 4 distinct browser contexts
    const contextHost = await browser.newContext();
    const contextP2 = await browser.newContext();
    const contextP3 = await browser.newContext();
    const contextP4 = await browser.newContext();

    const pageHost = await contextHost.newPage();
    const pageP2 = await contextP2.newPage();
    const pageP3 = await contextP3.newPage();
    const pageP4 = await contextP4.newPage();

    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

    // 1. Host creates party
    await pageHost.goto(baseURL);
    await pageHost.fill('#display-name', 'HostAlice');
    await pageHost.click('button[type="submit"]:has-text("Create Party")');

    // Wait for redirect to /party/[code]
    await pageHost.waitForURL(/\/party\/[A-Z0-9]{5}/);
    const partyUrl = pageHost.url();
    const partyCode = partyUrl.split('/party/')[1];
    expect(partyCode).toHaveLength(5);

    // 2. Players 2, 3, 4 join via party code
    for (const [page, name] of [
      [pageP2, 'PlayerBob'],
      [pageP3, 'PlayerCharlie'],
      [pageP4, 'PlayerDiana'],
    ] as const) {
      await page.goto(baseURL);
      await page.fill('#display-name', name);
      await page.fill('#party-code', partyCode);
      await page.click('button[type="submit"]:has-text("Join Party")');
      await page.waitForURL(/\/party\//);
    }

    // Assert 4 players in lobby
    await expect(pageHost.locator('text=Players (4)')).toBeVisible();

    // 3. Host starts game
    await pageHost.click('button:has-text("Start Game")');

    // Wait for Round 1 screen on all pages
    await pageHost.waitForSelector('text=Round 1 of 2');
    await pageP2.waitForSelector('text=Round 1 of 2');
    await pageP3.waitForSelector('text=Round 1 of 2');
    await pageP4.waitForSelector('text=Round 1 of 2');

    // 4. Submit Round 1 hints
    await pageHost.fill('#hint-input', 'My card is agile');
    await pageHost.click('button:has-text("Send Hint")');

    await pageP2.fill('#hint-input', 'My card deals heavy damage');
    await pageP2.click('button:has-text("Send Hint")');

    await pageP3.fill('#hint-input', 'My card is ground based');
    await pageP3.click('button:has-text("Send Hint")');

    await pageP4.fill('#hint-input', 'My card swings a weapon');
    await pageP4.click('button:has-text("Send Hint")');

    // Wait for Round 2 transition
    await pageHost.waitForSelector('text=Round 2 of 2');
    await pageP2.waitForSelector('text=Round 2 of 2');
    await pageP3.waitForSelector('text=Round 2 of 2');
    await pageP4.waitForSelector('text=Round 2 of 2');

    // 5. Submit Round 2 hints
    await pageHost.fill('#hint-input', 'It costs 4 elixir');
    await pageHost.click('button:has-text("Send Hint")');

    await pageP2.fill('#hint-input', 'It wears armor');
    await pageP2.click('button:has-text("Send Hint")');

    await pageP3.fill('#hint-input', 'It charges fast');
    await pageP3.click('button:has-text("Send Hint")');

    await pageP4.fill('#hint-input', 'It shouts loud');
    await pageP4.click('button:has-text("Send Hint")');

    // Wait for Voting phase
    await pageHost.waitForSelector('text=Vote to Eliminate the Imposter');
    await pageP2.waitForSelector('text=Vote to Eliminate the Imposter');

    // 6. Mid-game joiner becomes spectator
    const contextSpectator = await browser.newContext();
    const pageSpectator = await contextSpectator.newPage();
    await pageSpectator.goto(baseURL);
    await pageSpectator.fill('#display-name', 'SpectatorSam');
    await pageSpectator.fill('#party-code', partyCode);
    await pageSpectator.click('button[type="submit"]:has-text("Join Party")');
    await pageSpectator.waitForURL(/\/party\//);

    await expect(pageSpectator.locator('text=You are spectating this match')).toBeVisible();

    // 7. All 4 active players vote for PlayerBob
    for (const page of [pageHost, pageP2, pageP3, pageP4]) {
      // Find candidate button for PlayerBob
      const bobButton = page.locator('button', { hasText: 'PlayerBob' });
      if (await bobButton.isVisible()) {
        await bobButton.click();
        await page.click('button:has-text("Confirm Vote")');
      } else {
        // Self-vote forbidden for Bob -> Bob votes for HostAlice
        await page.click('button:has-text("HostAlice")');
        await page.click('button:has-text("Confirm Vote")');
      }
    }

    // 8. Assert Reveal Screen
    await pageHost.waitForSelector('text=Match Result');
    await expect(pageHost.locator('text=CREW WINS!').or(pageHost.locator('text=IMPOSTER WINS!'))).toBeVisible();

    // 9. Host clicks Play Again -> returns to lobby with updated scores & promoted spectator
    await pageHost.click('button:has-text("Play Again")');

    await pageHost.waitForSelector('text=Party Code');
    await pageSpectator.waitForSelector('text=Party Code');
    await expect(pageSpectator.locator('text=You are spectating this match')).not.toBeVisible();

    await contextHost.close();
    await contextP2.close();
    await contextP3.close();
    await contextP4.close();
    await contextSpectator.close();
  });
});
