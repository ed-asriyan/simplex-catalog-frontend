# User stories

The requirements baseline for the catalog. The design, the contracts, the schema and the code of every component are derived from this file; when they disagree, fix this file first and then the code.

This is a living document: it always describes the current intended behaviour, and stories are rewritten or removed as that changes. Story ids (`US-<epic><n>`) are what the code and its tests cite, so a change here that renumbers stories updates the references there in the same commit.

## The catalog in one paragraph
The catalog at [simplex-catalog.asriyan.me](https://simplex-catalog.asriyan.me) lists the community's [SimpleX](https://simplex.chat) **servers** (SMP and XFTP), **bots** and **chat relays**. Anyone adds one by its address, anonymously, on the website. Every 12 hours the catalog **checks** everything it lists: whether a server answers, where it is and whether it has an info page; whether a bot accepts a contact, what its profile says and what it writes first; whether a relay answers, and its name and image. The website shows the result of the latest check of each, the history of its checks and its **uptime**: the share of the checks of the last 7, 30 and 90 days that found it working. A bot is listed only once the maintainer has approved it.

## Roles
- **Visitor** — anyone who opens the website. A visitor needs no account; whatever they add, they add anonymously. What a visitor sets in their browser (the filters they last used, their labels) stays in that browser.
- **Maintainer** — the person who runs the catalog. They approve the bots visitors add, in the catalog's Supabase project, not on the website.

## Conventions
- A page is named by its address, the part after the website's own: `/#/servers`, `/#/servers/<id>`, `/#/bots`, `/#/bots/<id>`, `/#/relays`, `/#/relays/<id>`, `/#/faq`, where `<id>` is the catalog's id of what the page is about. A control is named as the page labels it (**Add server anonymously**, the **Status** filter); a link is written as a Markdown link, its text and where it leads (`[Official guide: SMP](https://simplex.chat/docs/server.html)`). A link to another website opens in a new tab.
- What the website says in a browser dialog (a prompt, an alert, a confirmation) is written as a quote. Times are shown relative to now ("2 hours ago"), with the exact date and time on hover.
- A screen is a *computer* when it is at least 1200 px wide, a *wide computer* from 1600 px, and a *phone* below 1200 px.
- The examples use the SMP server `smp://64jc_Sfg93KT6jSkJV7slVswcWNyNpz5uQ_gQlwQp5E@smp.example.com` in Germany, the XFTP server `xftp://xyz1_Sfg93KT6jSkJV7slVswcWNyNpz5uQ_gQlwQp5E@xftp.example.com`, the bot **Echo Bot** at `https://smp.example.com/a#lW0aZ7sMhEoQXxqk2ZRVrbq2yCwYrJkqM1gYbJcJbG0`, and the relay **Relay One** at `https://smp.example.com/r#nH3m0Y3f3kz2lQ9w5o6mE0b7cU1xR4tS8vJ2aK6dLfQ`.

## A. Getting around
- **US-A1.** As a visitor, when I open the website at its root, `/` or `/#/`, I am taken to `/#/servers`.
- **US-A2.** As a visitor, when I open any page on a computer, its header shows the logo **SimpleX Catalog** and the menu **🌐 Servers**, **🤖 Bots**, **📡 Relays**, **👥 Groups**, **📢 Channels**, **🎨 Themes**, **❓ FAQ**, the item of the page I am on marked; on its right, on a wide computer, the link **Join the group chat @ SimpleX!** and the sponsor buttons of US-A13, and on a narrower computer the link **💬 Chat** (hover: *Join the group chat @ SimpleX!*); and in the top right corner the GitHub corner, *View source on GitHub*.
- **US-A3.** As a visitor, when I open any page on a phone, its header shows a button, *Open menu*, and the logo **SimpleX Catalog**, with the GitHub corner in the top right corner.
- **US-A4.** As a visitor, when I tap *Open menu* on a phone, the menu slides in at the side: **🌐 Servers**, **🤖 Bots**, **📡 Relays**, **👥 Groups**, **📢 Channels**, **🎨 Themes**, **❓ FAQ**, then **Join the group chat @ SimpleX!**, then the sponsor buttons of US-A13, and its ✕, *Close menu*.
- **US-A15.** As a visitor, when I tap the menu's ✕ (*Close menu*) on a phone, or tap beside the menu, it closes.
- **US-A5.** As a visitor, when I click **🌐 Servers** in the menu, I am on `/#/servers` (US-B1), the item marked.
- **US-A6.** As a visitor, when I click **🤖 Bots** in the menu, I am on `/#/bots` (US-C1), the item marked.
- **US-A7.** As a visitor, when I click **📡 Relays** in the menu, I am on `/#/relays` (US-D1), the item marked.
- **US-A8.** As a visitor, when I click **❓ FAQ** in the menu, I am on `/#/faq` (US-A14), the item marked.
- **US-A9.** As a visitor, when I click **👥 Groups** or **📢 Channels** in the menu, the SimpleX directory, [simplex.chat/directory](https://simplex.chat/directory/), opens in a new tab.
- **US-A10.** As a visitor, when I click **🎨 Themes** in the menu, the SimpleX themes, [slcw.github.io/SimpleX-Themes](https://slcw.github.io/SimpleX-Themes/), open in a new tab.
- **US-A11.** As a visitor, when I click **Join the group chat @ SimpleX!** or **💬 Chat**, the catalog's group link opens in a new tab, for SimpleX to join the catalog's group.
- **US-A12.** As a visitor, when I click the logo **SimpleX Catalog** (*Back to Home*), I am on `/#/`, and so on `/#/servers` (US-A1); when I click the GitHub corner, [the catalog's code](https://github.com/ed-asriyan/simplex-catalog-frontend) opens in a new tab.
- **US-A13.** As a visitor, when I open any page, at its bottom I read:

  > The website is not affiliated with the SimpleX team. Content is contributed by anonymous users.
  > Servers, bots and relays that have been inactive for 90 days or more may be removed from the directory.
  >
  > Powered by · [SimpleX](https://simplex.chat) · [Svelte](https://svelte.dev) · [Supabase](https://supabase.com) · [UIkit](https://getuikit.com) · [Icons8](https://icons8.com)
  >
  > [Ed Asriyan](https://asriyan.me)

  On a computer that is not a wide one, the sponsor buttons are between the first lines and *Powered by*: the GitHub Sponsors button, *Sponsor ed-asriyan* (a frame showing https://github.com/sponsors/ed-asriyan/button), and the link [Donate using Liberapay](https://liberapay.com/ed-asriyan/donate). On a wide computer they are in the header (US-A2), on a phone in the menu (US-A4).
- **US-A14.** As a visitor, when I open `/#/faq`, I read the heading **❓ FAQ** and the questions, each with its answer open:
  - **How to deploy your own server?**

    > There are several guides to deploy your own SMP and XFTP server:
    > - [Official guide: SMP](https://simplex.chat/docs/server.html)
    > - [Official guide: XFTP](https://simplex.chat/docs/xftp-server.html)
    > - [Unofficial guide: SMP & XFTP - one command with docker compose](https://github.com/ed-asriyan/simplex-servers-docker)
  - **How to deploy your own relay?**

    > [Official guide: Relay](https://simplex.chat/docs/chat-relay.html)
  - **How to create your own bot?**

    > [Official guide: Bot](https://github.com/simplex-chat/simplex-chat/tree/stable/bots#readme)
  - **I submitted a bot but it didn't appear**

    > 1. Ensure that the bot's [ChatPeerType](https://github.com/simplex-chat/simplex-chat/blob/stable/bots/api/TYPES.md#chatpeertype) is `bot`. If it's not set or is `human`, the bot won't appear.
    >    *Note: This prevents regular user contacts from appearing in the catalog.*
    > 2. Wait up to 12 hours for the bot to appear in the catalog.
    > 3. If the bot hasn't appeared after 12 hours, check if the bot is online and the submitted contact link is active. If it's online and the contact link is active, please submit [a bug report](https://github.com/ed-asriyan/simplex-catalog-bots-validator/issues/new).

## B. Servers
### The page
- **US-B1.** As a visitor, when I open `/#/servers`, I read:

  > # 🌐 Servers Catalog
  > Discover and share community-run [SMP](https://simplex.chat/docs/server.html#overview) and [XFTP](https://simplex.chat/docs/xftp-server.html#overview) servers.
  > Here anyone can anonymously add servers to the public list. The availability of each server is checked periodically.
  >
  > Active servers: 12 · TOR servers: 3 · Total countries: 5

  then **Add server anonymously**, the link [How to deploy your own server?](/#/faq), and the world map (US-B2). Below are the filters (US-B10), 🔄 (US-B52), **Import labels** and **Export labels** (US-B31), **Page size: 50** (US-B28) and **Bulk mode (0)** (US-B34), and the table of the servers (US-B5), sorted by *Last Check* `▼`.

  The counts are computed from the servers found online at their latest check:
  - **Active servers** — the total number of servers online at their latest check;
  - **TOR servers** — the number of servers online at their latest check that are reached over Tor;
  - **Total countries** — the number of distinct countries that have at least one server online at its latest check, excluding *TOR*, *Yggdrasil* and *I2P*.
- **US-B2.** As a visitor, when I open `/#/servers`, the world map beside its text has each country with servers found online at their latest check coloured, the more of them the darker; countries with none are left blank.
- **US-B3.** As a visitor, when I hover a coloured country on the servers' map, I see its flag and name and `8 servers`, the number of its servers found online.
- **US-B4.** As a visitor, when I click a coloured country on the servers' map, the table shows the servers online in that country: the **Location** filter holds that country alone, *Inclusive*, and **Status** is *Active*; the other filters stay as they were.
- **US-B5.** As a visitor, when I open `/#/servers`, the table of the servers has, after a check box (US-B34), the columns *Labels*, *Type*, *URI*, *Location*, *Info page*, *Status*, *7d / 30d / 90d*, *Last Check*, *Added at* and *Details*, and a server's row shows:
  - *Labels*: its labels, ✅ and 🚫 (US-B30);
  - *Type*: `SMP` or `XFTP`;
  - *URI*: its host, `smp.example.com`, its last 30 characters after `…` when longer (hover: *Click to copy full URI*);
  - *Location*: the flag and the country, `🇩🇪 Germany`, or `TOR`, `Yggdrasil` or `I2P` for a server reached over one of them; nothing before its first check;
  - *Info page*: a link icon when it has an info page (hover: *Click to open server info page*);
  - *Status*: *Online* (green), *Offline* (red) or, before its first check, *Unknown* (grey);
  - *7d / 30d / 90d*: its uptime over each, `100% 97% 90%`, green when 100%, red when lower, `N/A` for a period with no check;
  - *Last Check* and *Added at*: when it was last checked (nothing before its first check) and when it was added, `2 hours ago`;
  - *Details*: the button **Details**.

  A server not online at its latest check, offline or not checked yet, has its row in red. Under the table I read `Total servers matching filters: 37`.
- **US-B6.** As a visitor, when I click a server's host in the *URI* column, the server's whole address, `smp://64jc_Sfg93KT6jSkJV7slVswcWNyNpz5uQ_gQlwQp5E@smp.example.com`, is copied.

  The table shows nothing of it; on a server's page (US-B40) *Copied to clipboard* stands in the host's place for 4 seconds.
- **US-B7.** As a visitor, when I click a server's link icon in the *Info page* column, its info page opens in a new tab: `https://smp.example.com`, or `http://` for a server reached over Tor, I2P or Yggdrasil.
- **US-B8.** As a visitor, when I click **Details** in a server's row, or anywhere in the row but its check box, labels, host and info page link, I am on the server's page, `/#/servers/<id>` (US-B40).
- **US-B9.** As a visitor, when I click [How to deploy your own server?](/#/faq) on `/#/servers`, I am on `/#/faq` (US-A14).

### Filters
- **US-B10.** As a visitor, when I open `/#/servers`, above the table are the filters **URI** (*Filter by host*), **Identity** (*Filter by identity*), **Type**, **Status**, **Info page**, **Location**, **Labels**, **Min uptime 7d (%)** (*e.g. 90*), **Min uptime 30d (%)** (*e.g. 80*) and **Min uptime 90d (%)** (*e.g. 70*).

  A text or number filter applies a moment after I stop typing; each filter I set goes into the page's address (US-B22).
- **US-B11.** As a visitor, when I type `example` in **URI**, the table shows the servers whose host contains it, in any case.
- **US-B12.** As a visitor, when I type `64jc` in **Identity**, the table shows the servers whose identity contains it, in any case.
- **US-B13.** As a visitor, when I choose *SMP* or *XFTP* in **Type**, the table shows the servers of that type; *All* shows both.
- **US-B14.** As a visitor, when I choose in **Status** *Active* or *Inactive*, the table shows the servers online at their latest check, or offline at it; *Any* shows them all.
- **US-B14b.** As a visitor, when I choose *Unknown* in **Status**, it goes into the page's address, `filterStatus=unknown`, which the page reads as no filter: the table shows all the servers, and **Status** reads *Any*.
- **US-B15.** As a visitor, when I choose *Yes* or *No* in **Info page**, the table shows the servers with an info page, or without one; *Any* shows them all.
- **US-B16.** As a visitor, when I click **Location** (reading *Any*), it opens the list of the locations of the catalog's servers, `Not TOR`, `Not Yggdrasil` and `Not 🧄 I2P` first, then the countries by name (`Not 🇩🇪 Germany`), each with a check box, and *Exclusive* at its top.
- **US-B17.** As a visitor, when I tick `Not 🇩🇪 Germany` in the **Location** list, the table shows only the servers that are not in Germany, and the button reads *1 selected*; ticking another hides its servers too.
- **US-B18.** As a visitor, when I click *Exclusive* at the top of the **Location** list, it reads *Inclusive*, each location reads without *Not* (`🇩🇪 Germany`), and the table shows only the servers in the locations ticked; clicking it again turns it back.
- **US-B19.** As a visitor, when I click *Clear* in the **Location** list, shown while a location is ticked, every location is unticked and the button reads *Any*.
- **US-B20.** As a visitor, when I click **Labels**, it opens the list of my labels, `Not added` and `Not ignored` (✅ and 🚫), which work as the locations do (US-B17 to US-B19): ticking `Not added` hides the servers I labelled ✅; after *Exclusive* is clicked, ticking `added` shows only them.
- **US-B21.** As a visitor, when I type `90` in **Min uptime 7d (%)**, the table shows the servers whose uptime over the last 7 days is at least 90%; the same for 30 and 90 days.
- **US-B22.** As a visitor, when I open a link to `/#/servers` with filters in its address, as the page wrote them (`/#/servers?filterProtocol=smp&filterStatus=true`), I see the table with those filters set.
- **US-B22b.** As a visitor, when I open a link to `/#/servers` with a sort in its address, as the page wrote it (`/#/servers?sortField=host&sortOrder=asc`), I see the table sorted so, the column's title marked (`URI ▲`).
- **US-B23.** As a visitor, when I open `/#/servers` with no filter in its address, the filters are those I used last in this browser; on my first visit, **Status** *Active*, the others empty.
- **US-B24.** As a visitor, when I click **Active servers** in the counts, **Status** becomes *Active*; the other filters stay as they were.
- **US-B25.** As a visitor, when I click **TOR servers** in the counts, **Location** holds *TOR* alone, *Inclusive*, and **Status** becomes *Active*; the other filters stay as they were.
- **US-B26.** As a visitor, when I click **Total countries** in the counts, **Location** holds `Not TOR`, `Not Yggdrasil` and `Not 🧄 I2P`, *Exclusive*, and **Status** becomes *Active*; the other filters stay as they were.

### Sorting and pages
- **US-B27.** As a visitor, when I click a column's title in the servers' table — *Type*, *URI*, *Location*, *Info page*, *Status*, *7d*, *30d*, *90d*, *Last Check* or *Added at* — the table is sorted by it, descending, the title marked `▼`; when I click it again, ascending, `▲`.

  The sort goes into the page's address (US-B22b).
- **US-B28.** As a visitor, when I choose 5, 10, 20, 50 or 100 in **Page size: 50**, the table shows that many servers a page.

  The choice does not go into the page's address: reloading the page, or opening its link, gives the size the address gives (`pageSize=20`), 50 without one.
- **US-B29.** As a visitor, when there are more servers than a page holds, under the table are a button for each page, the current one marked, and **← Previous page** and **Next page →**, each shown when there is a page that way; when I click one, the table shows that page, and the page goes into the address.
- **US-B52.** As a visitor, when I click 🔄 (*Refresh*) on `/#/servers`, the table is fetched again with what the latest checks found, a spinner in 🔄's place while it loads.

### Labels
- **US-B30.** As a visitor, when I click a server's ✅ (*Add*) or 🚫 (*Ignore*), shown dimmed until set, the label is set, bright, its hover *Added* or *Ignored*; when I click it again, it is cleared.

  My labels are saved in my browser, for me only, and are there when I come back.
- **US-B31.** As a visitor, when I click **Export labels**, my browser saves my labels as `simplex-catalog.asriyan.me_labels_2026-11-25T10:00:00.000Z.json`.
- **US-B32.** As a visitor, when I click **Import labels** and choose such a file, I am asked:

  > The current labels in this browser will be replaced by the import:
  >
  > Label "added": 3 servers
  > Label "ignored": 1 servers
  >
  > Continue?

  When I confirm, my labels are those of the file, in the table and saved in my browser.
- **US-B33.** As a visitor, when I cancel that question, my labels stay as they were.

### Bulk mode
- **US-B34.** As a visitor, when I tick a server's check box, it counts in **Bulk mode (1)**.

  With fewer than two ticked, **Bulk mode** is disabled (hover: *Select 2 or more rows*).
- **US-B53.** As a visitor, when I tick the box in the head of the servers' table, every server on the page is ticked and counts in **Bulk mode**; when I untick it, they are all unticked.
- **US-B35.** As a visitor, when I click **Bulk mode (3)**, a dialog shows the first of the servers ticked, in the order of the table: `1 / 3`, the QR code of its address, *URI:* and its host to copy (US-B6), its location, its info page link, its status and its uptime, then **Next →** and **Mark as added and Next →**.
- **US-B36.** As a visitor, when I click **Next →** in the dialog, it shows the next server, with **← Back** from the second on; on the last one the button reads **Close**, and clicking it closes the dialog.
- **US-B37.** As a visitor, when I click **← Back** in the dialog, it shows the server before.
- **US-B38.** As a visitor, when I click **Mark as added and Next →** (**Mark as added and Close** on the last), the server's ✅ is set in the table and the dialog goes on as **Next →** does.

  The label is not saved in my browser then: after a reload it is gone, unless I have since set or cleared a label by clicking it (US-B30), which saves all my labels, this one included.
- **US-B39.** As a visitor, when I click the dialog's ✕ or press Escape, it closes.

### A server's page
- **US-B40.** As a visitor, when I open a server's page, `/#/servers/<id>`, I see:
  - its type and its host, `SMP smp.example.com`, the host's last 30 characters after `…` when longer, and `Identity 64jc_Sfg93KT6jSkJV7slVswcWNyNpz5uQ_gQlwQp5E`;
  - when other servers in the catalog have the same identity, `There is 1 more server with this identity →`, or `There are 2 more servers with this identity →`;
  - the QR code of its address, *URI:* and its host to copy (US-B6);
  - *Location*, *Status*, *Uptime*, *Info page* (a link reading *Info page*, to its info page, when it has one), *Last check*, *Added at*, *Labels* (US-B30) and *URI*, as the table shows them;
  - **Availability History**: the timeline of its checks that found something different from the one before, scrolled to the latest, each with its date and time (`Nov 25, 2026`, `10:00 AM`), its *Status*, `Online 🇩🇪` or `Offline`, and its *Is Info Page*, `Available` or `Not Available`, its dot green when both are, red otherwise; before its first check, "No availability data yet."
- **US-B41.** As a visitor, when I click `There is 1 more server with this identity →`, I am on `/#/servers?filterIdentity=<its identity>`, the table showing the servers with that identity.
- **US-B42.** As a visitor, when I open `/#/servers/<id>` with an id the catalog does not have, I read "Server not found."

### Adding a server
- **US-B43.** As a visitor, when I click **Add server anonymously**, I am asked "Enter SMP or XFTP server URI:".
- **US-B44.** As a visitor, when I enter `smp://64jc_Sfg93KT6jSkJV7slVswcWNyNpz5uQ_gQlwQp5E@smp.example.com` there, I am told:

  > The server is added to the database. If the server is available, it will soon appear in the table for everyone.

  and the server is in the table at once, *Unknown* until its first check (US-B48); it shows under **Status** *Any*, not under the *Active* of a first visit.
- **US-B45.** As a visitor, when I enter an address with several hosts, `smp://64jc_Sfg93KT6jSkJV7slVswcWNyNpz5uQ_gQlwQp5E@smp.example.com,abcdefghijklmnop.onion`, I am told the same, and the catalog has a server for each host, with the same identity.
- **US-B46.** As a visitor, when I enter an address the catalog has already, I am told the same, and nothing changes.
- **US-B47.** As a visitor, when I enter an address that is not a SMP or XFTP server's, `https://smp.example.com`, or one without its identity, `smp://smp.example.com`, I am told "Invalid URI format", and nothing is added.
- **US-B54.** As a visitor, when I cancel the question, or enter nothing, nothing happens.

### Checks
- **US-B48.** As a visitor, when the catalog's check, which runs every 12 hours, finds a server answering as a SMP or XFTP server at its address, the server shows *Online*, and when it finds it not answering, even after a few tries, *Offline*; its *Last Check* is the check's time, and the check is in its **Availability History** (US-B40) when it found something different from the one before.
- **US-B49.** As a visitor, when the catalog's check finds where a server's host is, the server's *Location* is the country of its host's address, or *TOR*, *Yggdrasil* or *I2P* for a host on one of them.
- **US-B50.** As a visitor, when the catalog's check finds a server's host answering over HTTPS (HTTP for a host on Tor, I2P or Yggdrasil) within 5 seconds with a page that mentions SimpleX, the server has an info page.
- **US-B51.** As a visitor, when the catalog's check of a server is over, the server's uptime over 7, 30 and 90 days is the share of the hours of those last days it was *Online*.

  What a check found holds from its hour until the hour of the next check, the latest check's until now, and the hours before its first check do not count; a server never checked has `N/A`.

## C. Bots
### The page
- **US-C1.** As a visitor, when I open `/#/bots`, I read:

  > ## 🤖 Bots
  > Discover and share community-run SimpleX bots.
  > Here anyone can anonymously add bots to the public list. The availability of each bot is checked periodically.

  then **Add bot anonymously** and the link [How to create your own bot?](/#/faq); below, 🔄 (*Refresh*), the search field *Search* and the status filter, and the bots as cards, 12 a page, those online at their latest check first. A bot's card shows its image, or 🤖 without one; its name; *Offline* (red) when it was offline at its latest check; `Last check: 2 hours ago`; its description, or "No description"; and **Visit**. Under the cards I read `Total bots matching filters: 14`; with no bot to show, "No bots found."
- **US-C2.** As a visitor, when I click **Visit** on a bot's card, the bot's address opens in a new tab, for SimpleX to connect to it.
- **US-C3.** As a visitor, when I click a bot's card anywhere but **Visit**, I am on the bot's page, `/#/bots/<id>` (US-C12).
- **US-C4.** As a visitor, when I click [How to create your own bot?](/#/faq) on `/#/bots`, I am on `/#/faq` (US-A14).
- **US-C5.** As a visitor, when I click 🔄 (*Refresh*), the cards are fetched again with what the latest checks found, a spinner in 🔄's place while they load.

### Search, filter and pages
- **US-C6.** As a visitor, when I type `echo` in *Search*, a moment after I stop typing the cards are the bots whose name or description contains it, in any case, from the first page.
- **US-C7.** As a visitor, when I choose *Online* or *Offline* in the status filter, the cards are the bots online at their latest check, or offline at it, from the first page; *All* shows them all.
- **US-C8.** As a visitor, when my search or filter finds no bot after one that found some, I read "No bots found.", followed by the line and the page buttons of that earlier one, its number unchanged: `Total bots matching filters: 14`.
- **US-C9.** As a visitor, when I open a link to `/#/bots` with a search and a filter in its address, as the page wrote them (`/#/bots?filterStatus=false&q=echo`), I see the cards they find.
- **US-C10.** As a visitor, when I open `/#/bots` with neither in its address, the search and the filter are those I used last in this browser; on my first visit, no search and *Online*.
- **US-C11.** As a visitor, when I click a page's button under the cards, or **← Previous page** or **Next page →**, the cards are that page's, and the page goes into the address.

  Under the cards are a button for each page, the current one marked, and **← Previous page** and **Next page →**, each shown when there is a page that way.

### A bot's page
- **US-C12.** As a visitor, when I open a bot's page, `/#/bots/<id>`, I see:
  - its image, or 🤖; its name with *Online*, *Offline* or, before its first check, *Unknown*; `Last check: 2 hours ago`;
  - **Open the bot**, and a copy icon (hover: *Copy connection link to clipboard*);
  - **Description**: its description, or "*Empty. Read "The First Bot's Message" to understand how the bot works.*";
  - **Commands**, when it offers any: a table of each command's *Keyword* (`help`) and *Label* (`Show help`);
  - **The First Bot's Message**, when it wrote one: what it wrote first to whoever connected to it, line breaks kept;
  - **Uptime**: *7 days*, *30 days* and *90 days*, `100%`, `97%`, `90%`, each red when under 100%, and the timeline of its checks that found it different from the one before, each with its date and time and *Is Online*, `Online` (green) or `Offline` (red);
  - "The bot was added to the catalog 3 days ago".
- **US-C13.** As a visitor, when I click **Open the bot**, the bot's address opens in a new tab, for SimpleX to connect to it.
- **US-C14.** As a visitor, when I click the copy icon on a bot's page, the bot's address is copied.
- **US-C15.** As a visitor, when I open `/#/bots/<id>` with an id nobody has added, I read "Bot not found."

### Adding a bot
- **US-C16.** As a visitor, when I click **Add bot anonymously**, I am asked "Enter invite link:".
- **US-C17.** As a visitor, when I enter the bot's short link there, `https://smp.example.com/a#lW0aZ7sMhEoQXxqk2ZRVrbq2yCwYrJkqM1gYbJcJbG0`, its key 32 bytes in base64url, or its full address, `https://simplex.chat/contact#/?v=2-7&smp=smp%3A%2F%2F…`, I am told:

  > The bot was submitted and will appear after it has been moderated and approved.

  It is not listed until the maintainer approves it (US-C22).
- **US-C18.** As a visitor, when I enter a bot's short link with anything after its key, such as the certificate of a bot's own server, `https://smp.example.com/a#lW0aZ7sMhEoQXxqk2ZRVrbq2yCwYrJkqM1gYbJcJbG0?c=…`, I am told "URL has invalid format. Invalid contact data.", and nothing is added.
- **US-C19.** As a visitor, when I enter an address the catalog has already, I am told `duplicate key value violates unique constraint "bots_address_key"`, and nothing changes.
- **US-C20.** As a visitor, when I enter an address that is not a bot's, I am told why, and nothing is added:
  - not a link at all: "Invalid URL format";
  - not HTTPS, `http://smp.example.com/a#…`: "URL has invalid format. Schema must be HTTPS";
  - a group's link, or a link to anything but a contact, `https://smp.example.com/g#…`: "URL is not a bot address";
  - on `localhost`: "Hostname is not allowed";
  - a short link whose key is not 32 bytes, or a full address without its SMP server: "URL has invalid format. Invalid contact data."
- **US-C21.** As a visitor, when I cancel the question, or enter nothing, nothing happens.

### Approval and checks
- **US-C22.** As the maintainer, when I approve a bot a visitor added, in the catalog's Supabase project, the catalog checks it from its next check on, and the website lists it once a check has read its profile.

  Whether to approve it is mine to decide: the catalog lists an approved bot whatever its profile says it is, a bot, a person, or nothing.
- **US-C23.** As a visitor, when I open the page of a bot the maintainer has not approved, `/#/bots/<id>`, I read "Error: Bot not found", in red.

  The catalog never checks or lists a bot the maintainer has not approved.
- **US-C24.** As a visitor, when the catalog's check, which runs every 12 hours, reads the profile at an approved bot's address, the bot shows the name, description, image and commands the profile gives.
- **US-C25.** As a visitor, when the catalog's check finds that a bot accepted the catalog as a contact within the time limit, the bot shows *Online*, and when it finds it did not, even after a few tries, *Offline*; its `Last check` is the check's time.

  The catalog connects incognito, and deletes the contact once the check is over.
- **US-C26.** As a visitor, when the catalog's check finds that a bot's address does not exist, the bot shows what the check before it found, its status, name, description and first message, and its `Last check` is that check's time: nothing new is recorded for it.
- **US-C27.** As a visitor, when the catalog's check finds what a bot wrote first after accepting the contact, within the time limit, **The First Bot's Message** is that message; when the bot wrote nothing, it is the message an earlier check found, or none.
- **US-C28.** As a visitor, when the catalog's check of a bot is over, the bot's uptime over 7, 30 and 90 days is the share of the checks of those last days that found it *Online*, and the check is in its timeline when it found it different from the one before.

## D. Relays
### The page
- **US-D1.** As a visitor, when I open `/#/relays`, I read:

  > ## 📡 Relays
  > Discover and share community-run SimpleX relays.
  > Here anyone can anonymously add relays to the public list. The availability of each relay is checked periodically.

  then **Add relay anonymously** and the link [How to deploy your own relay?](/#/faq); below, the filters (US-D6), 🔄 (*Refresh*), **Page size: 50**, and the table of the relays, sorted by *Last Check* `▼`. The table has the columns *Image*, *URI*, *Name*, *Status*, *7d / 30d / 90d*, *Last Check* and *Added*; a relay's row shows its image, or 📡 without one; its address, its first 40 characters then `…` when longer (hover: *Click to copy URI*); its name, or `—`; *Online* (green) or *Offline* (red) at its latest check; its uptime over each period, `100% 97% 90%`, green when 100%, red when lower; when it was last checked and when it was added, `2 hours ago`. A relay offline at its latest check has its row in red. Under the table I read `Total relays matching filters: 4`; with no relay to show, also "No relays found."
- **US-D2.** As a visitor, when I click a relay's address in the table, it is copied, and *Copied to clipboard* stands in its place for 4 seconds.
- **US-D3.** As a visitor, when I click a relay's row anywhere but its address, I am on the relay's page, `/#/relays/<id>` (US-D14).
- **US-D4.** As a visitor, when I click [How to deploy your own relay?](/#/faq) on `/#/relays`, I am on `/#/faq` (US-A14).
- **US-D5.** As a visitor, when I click 🔄 (*Refresh*), the table is fetched again with what the latest checks found, a spinner in 🔄's place while it loads.

### Filters, sorting and pages
- **US-D6.** As a visitor, when I open `/#/relays`, above the table are the filters **URI** (*Filter by URI*), **Name** (*Filter by name*), **Status**, **Min uptime 7d (%)** (*e.g. 90*), **Min uptime 30d (%)** (*e.g. 80*) and **Min uptime 90d (%)** (*e.g. 70*).

  A text or number filter applies a moment after I stop typing.
- **US-D7.** As a visitor, when I type `example` in **URI**, or `relay` in **Name**, the table shows the relays whose address or name contains it, in any case.
- **US-D8.** As a visitor, when I choose *Online* or *Offline* in **Status**, the table shows the relays online at their latest check, or offline at it; *Any* shows them all.
- **US-D9.** As a visitor, when I type `90` in **Min uptime 7d (%)**, the table shows the relays whose uptime over the last 7 days is at least 90%; the same for 30 and 90 days.
- **US-D10.** As a visitor, when I open a link to `/#/relays` with filters in its address, as the page wrote them (`/#/relays?filterStatus=any&filterName=relay`), I see the table with those filters set; when I open it with none, the filters are those I used last in this browser, and on my first visit **Status** *Online*.
- **US-D11.** As a visitor, when I click a column's title in the relays' table — *URI*, *Name*, *Status*, *7d*, *30d*, *90d*, *Last Check* or *Added* — the table is sorted by it, descending, the title marked `▼`; when I click it again, ascending, `▲`.

  The sort goes into the page's address.
- **US-D12.** As a visitor, when I choose 10, 20, 50 or 100 in **Page size: 50**, the table shows that many relays a page, from the first page, and the size goes into the page's address.
- **US-D13.** As a visitor, when there are more relays than a page holds, under the table are a button for each page, the current one marked, and **← Previous page** and **Next page →**, each shown when there is a page that way; when I click one, the table shows that page, and the page goes into the address.

### A relay's page
- **US-D14.** As a visitor, when I open a relay's page, `/#/relays/<id>`, I see its image, or 🤖 without one; its name with *Online* or *Offline*; `Last check: 2 hours ago`; the QR code of its address and the address to copy, its first 28 characters then `…` when longer; **Availability History**, the timeline of its checks that found it different from the one before, each with its date and time and *Is Online*, `Online` (green) or `Offline` (red), or "No availability data yet."; and "Added to the catalog 3 days ago".
- **US-D15.** As a visitor, when I click the address on a relay's page, it is copied, and *Copied to clipboard* stands in its place for 4 seconds.
- **US-D16.** As a visitor, when I open `/#/relays/<id>` with an id of no relay the catalog lists, I read "Relay not found."

### Adding a relay
- **US-D17.** As a visitor, when I click **Add relay anonymously**, I am asked "Enter relay URI:".
- **US-D18.** As a visitor, when I enter the relay's address there, `https://smp.example.com/r#nH3m0Y3f3kz2lQ9w5o6mE0b7cU1xR4tS8vJ2aK6dLfQ`, or one that names its server's other hosts, port and certificate, `https://smp.example.com/r#nH3m0Y3f3kz2lQ9w5o6mE0b7cU1xR4tS8vJ2aK6dLfQ?h=abcdefghijklmnop.onion&p=5223&c=<fingerprint>`, I am told:

  > The relay is added to the database. If the relay is available, it will soon appear in the table for everyone.

  It is listed once a check has reached it (US-D22).
- **US-D19.** As a visitor, when I enter an address the catalog has already, I am told `duplicate key value violates unique constraint "relays_url_key"`, and nothing changes.
- **US-D20.** As a visitor, when I enter an address that is not a relay's, I am told why, and nothing is added:
  - not a link at all: "Invalid URL format";
  - not HTTPS: "URL has invalid format. Schema must be HTTPS";
  - a link to anything but a relay, `https://smp.example.com/a#…`: "URL is not a relay address";
  - on `localhost`, or naming `localhost` among its hosts: "Hostname is not allowed";
  - a key that is not 32 bytes in base64url, a port in the link's host part, a host, port or certificate that cannot be read: "URL has invalid format. Invalid contact data."
- **US-D21.** As a visitor, when I cancel the question, or enter nothing, nothing happens.

### Checks
- **US-D22.** As a visitor, when the catalog's check, which runs every 12 hours, finds a relay answering as a chat relay at its address, the relay shows *Online*, with the name and image it answered with.

  A relay no check has reached yet is not listed.
- **US-D23.** As a visitor, when the catalog's check finds a relay not answering, the relay shows *Offline*, with the name and image an earlier check found.
- **US-D24.** As a visitor, when the catalog's check of a relay is over, the relay's *Last Check* is the check's time, its uptime over 7, 30 and 90 days is the share of the checks of those last days that found it *Online*, and the check is in its **Availability History** when it found it different from the one before.
