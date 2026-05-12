const automator = require('miniprogram-automator');

async function test() {
  console.log('Connecting to DevTools...');
  const miniProgram = await automator.launch({
    projectPath: 'D:/projects/personal-crm/frontend/dist/build/mp-weixin',
    cliPath: 'C:/Program Files (x86)/Tencent/微信web开发者工具/cli.js',
    autoPort: 9420
  });
  console.log('Connected!');

  // Navigate to home page
  await miniProgram.reLaunch('/pages/index/index');
  await new Promise(r => setTimeout(r, 2000));

  // Get current page
  const page = await miniProgram.currentPage();
  console.log('Current page:', page.path);

  // Get page data
  try {
    const data = await page.data();
    console.log('Page data:', JSON.stringify(data, null, 2).substring(0, 500));
  } catch (e) {
    console.log('Could not get page data:', e.message);
  }

  // Get all buttons
  try {
    const buttons = await page.$$('button');
    console.log('Buttons found:', buttons.length);
    for (const btn of buttons.slice(0, 5)) {
      console.log('  Button text:', await btn.text());
    }
  } catch (e) {
    console.log('No buttons:', e.message);
  }

  // Get all views
  try {
    const views = await page.$$('view');
    console.log('Views found:', views.length);
    for (const view of views.slice(0, 10)) {
      const text = await view.text();
      if (text && text.trim()) {
        console.log('  View text:', text.substring(0, 50));
      }
    }
  } catch (e) {
    console.log('No views:', e.message);
  }

  // Navigate to contacts page
  try {
    await miniProgram.navigateTo('/pages/contacts/list');
    await new Promise(r => setTimeout(r, 2000));
    const contactsPage = await miniProgram.currentPage();
    console.log('\nContacts page:', contactsPage.path);
    const contactViews = await contactsPage.$$('view');
    console.log('Views on contacts page:', contactViews.length);
    for (const view of contactViews.slice(0, 10)) {
      const text = await view.text();
      if (text && text.trim()) {
        console.log('  View text:', text.substring(0, 50));
      }
    }
  } catch (e) {
    console.log('Could not navigate to contacts:', e.message);
  }

  await miniProgram.close();
  console.log('\nTest complete');
}

test().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
