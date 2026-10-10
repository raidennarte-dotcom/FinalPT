/* script.js — ONE script for every page (sign up, log in, main page).
   Each section only runs if its page elements exist.
   Frontend only: the backend handles data, login and saving. */
(function () {
  "use strict";

  /* ==========================================================
     A. SIGN UP PAGE: both passwords must match
     ========================================================== */
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");

  if (password && confirmPassword) {
    const checkMatch = function () {
      confirmPassword.setCustomValidity(
        password.value !== confirmPassword.value
          ? "Passwords do not match."
          : "",
      );
    };
    password.addEventListener("input", checkMatch);
    confirmPassword.addEventListener("input", checkMatch);
  }

  /* ==========================================================
     B. MAIN PAGE (only runs when the profile button exists)
     ========================================================== */
  const profileToggle = document.getElementById("profile-toggle");
  if (!profileToggle) return;

  const STORAGE_KEY = "platform-theme";
  const root = document.documentElement;
  const profilePanel = document.getElementById("profile-panel");
  const themeToggle = document.getElementById("theme-toggle");
  const settingsToggle = document.getElementById("settings-toggle");
  const settingsMenu = document.getElementById("settings-menu");
  const feedList = document.getElementById("feed-list");

  /* ---------- 1. DARK MODE ---------- */
  function readSavedTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === "dark" || saved === "light" ? saved : null;
    } catch (error) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      /* storage blocked: theme still applies for this visit */
    }
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
    }
  }

  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  applyTheme(readSavedTheme() || (prefersDark ? "dark" : "light"));

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      const next =
        root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      saveTheme(next);
    });
  }

  /* ---------- 2. SETTINGS MENU ---------- */
  function setSettingsOpen(open) {
    if (!settingsToggle || !settingsMenu) return;
    settingsMenu.hidden = !open;
    settingsToggle.setAttribute("aria-expanded", String(open));
  }

  if (settingsToggle && settingsMenu) {
    settingsToggle.addEventListener("click", function () {
      setSettingsOpen(settingsMenu.hidden);
    });
  }

  /* ---------- 3. POSTS: Like, Comment, Share ----------
     Works with the simple post markup: three buttons with the
     class post__action and the text Like / Comment / Share.
     Each post is "enhanced" automatically: counts, the comment
     area and ARIA attributes are added by this script, so posts
     the backend adds later work too. */
  const ACTIONS = ["like", "comment", "share"];
  let postCounter = 0;

  function makeEl(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  /* ----- Toast message (used by Like and Share) ----- */
  let toastEl = null;
  let toastTimer = null;

  function showToast(message) {
    if (!toastEl) {
      toastEl = makeEl("div", "toast");
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.remove("toast--visible");
    void toastEl.offsetWidth; // restart the fade-in
    toastEl.classList.add("toast--visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("toast--visible");
    }, 2200);
  }

  /* ----- Comment bubble: avatar, name, time, rounded bubble ----- */
  function buildComment(text) {
    const nameEl = document.getElementById("user-full-name");
    const name = nameEl ? nameEl.textContent.trim() : "";
    const avatarImg = document.querySelector("#user-avatar img");

    const item = makeEl("li", "post__comment");

    const avatar = makeEl("div", "post__comment-avatar");
    if (avatarImg && avatarImg.src) {
      const img = document.createElement("img");
      img.src = avatarImg.src;
      img.alt = "";
      avatar.appendChild(img);
    } else if (name) {
      avatar.textContent = name.charAt(0).toUpperCase();
    }

    const main = makeEl("div", "post__comment-main");
    const bubble = makeEl("div", "post__comment-bubble");
    bubble.appendChild(makeEl("p", "post__comment-name", name || "You"));
    bubble.appendChild(makeEl("p", "post__comment-text", text));
    main.appendChild(bubble);
    main.appendChild(makeEl("time", "post__comment-time", "Just now"));

    item.appendChild(avatar);
    item.appendChild(main);
    return item;
  }

  /* ----- Share menu: Copy link / Share to my feed ----- */
  function buildShareMenu() {
    const menu = makeEl("div", "share-menu");
    menu.setAttribute("role", "menu");
    menu.hidden = true;

    [
      ["copy", "Copy link"],
      ["repost", "Share to my feed"],
    ].forEach(function (entry) {
      const item = makeEl("button", "share-menu__item", entry[1]);
      item.type = "button";
      item.dataset.share = entry[0];
      item.setAttribute("role", "menuitem");
      menu.appendChild(item);
    });
    return menu;
  }

  function closeShareMenus() {
    document.querySelectorAll(".share-menu").forEach(function (menu) {
      menu.hidden = true;
    });
    document
      .querySelectorAll('[data-action="share"]')
      .forEach(function (button) {
        button.setAttribute("aria-expanded", "false");
      });
  }

  async function handleShareChoice(item) {
    const post = item.closest(".post");
    if (!post) return;
    const choice = item.dataset.share;
    closeShareMenus();

    if (choice === "copy") {
      const url = window.location.href.split("#")[0] + "#" + post.id;
      try {
        await navigator.clipboard.writeText(url);
        showToast("Link copied");
      } catch (error) {
        window.prompt("Copy this link:", url);
      }
    } else if (choice === "repost") {
      showToast("Shared to your feed");
      // backend: create the repost here (add the post to the user's own feed)
    }
  }

  function buildCommentSection(id) {
    const section = makeEl("section", "post__comments");
    section.id = id;
    section.hidden = true;

    section.appendChild(makeEl("ul", "post__comment-list"));

    const form = makeEl("form", "post__comment-form");
    form.action = "#";
    form.method = "post";

    const inputId = id + "-input";
    const label = makeEl("label", "visually-hidden", "Write a comment");
    label.htmlFor = inputId;

    const input = makeEl("input", "post__comment-input");
    input.type = "text";
    input.id = inputId;
    input.name = "comment";
    input.placeholder = "Write a comment...";

    const submit = makeEl("button", "post__comment-submit", "Send");
    submit.type = "submit";

    form.appendChild(label);
    form.appendChild(input);
    form.appendChild(submit);
    section.appendChild(form);
    return section;
  }

  function enhancePost(post) {
    if (post.dataset.enhanced === "true") return;
    post.dataset.enhanced = "true";

    postCounter += 1;
    if (!post.id) post.id = "post-auto-" + postCounter;

    // Comment area: create it if the post doesn't have one
    let section = post.querySelector(".post__comments");
    if (!section) {
      section = buildCommentSection(post.id + "-comments");
      const actions = post.querySelector(".post__actions");
      if (actions && actions.parentNode) {
        actions.parentNode.insertBefore(section, actions.nextSibling);
      } else {
        post.appendChild(section);
      }
    } else if (!section.id) {
      section.id = post.id + "-comments";
    }

    post.querySelectorAll(".post__action").forEach(function (button) {
      const key = (button.dataset.action || button.textContent)
        .trim()
        .toLowerCase();
      if (ACTIONS.indexOf(key) === -1) return;
      button.dataset.action = key;

      // Wrap the text in a label so it can change (e.g. "Link copied")
      if (!button.querySelector(".post__action-label")) {
        const label = makeEl(
          "span",
          "post__action-label",
          button.textContent.trim(),
        );
        button.textContent = "";
        button.appendChild(label);
      }

      if (key !== "share" && !button.querySelector(".post__count")) {
        button.appendChild(makeEl("span", "post__count", "0"));
      }

      if (key === "like" && !button.hasAttribute("aria-pressed")) {
        button.setAttribute("aria-pressed", "false");
      }

      if (key === "comment") {
        if (!button.hasAttribute("aria-expanded")) {
          button.setAttribute("aria-expanded", "false");
        }
        button.setAttribute("aria-controls", section.id);
      }

      if (key === "share") {
        button.setAttribute("aria-haspopup", "menu");
        button.setAttribute("aria-expanded", "false");
        const actions = post.querySelector(".post__actions");
        if (actions && !actions.querySelector(".share-menu")) {
          actions.appendChild(buildShareMenu());
        }
      }
    });
  }

  function changeCount(el, delta) {
    if (!el) return;
    const current = parseInt(el.textContent, 10) || 0;
    el.textContent = String(Math.max(0, current + delta));
  }

  function flashLabel(button, text) {
    const label = button.querySelector(".post__action-label");
    if (!label) return;
    if (!label.dataset.original) label.dataset.original = label.textContent;
    label.textContent = text;
    clearTimeout(button._flashTimer);
    button._flashTimer = setTimeout(function () {
      label.textContent = label.dataset.original;
    }, 1600);
  }

  function handleLike(button) {
    // Preview: add data-logged-in="false" to <body> to see this message
    if (document.body.dataset.loggedIn === "false") {
      showToast("Log in to like this post");
      return;
    }
    const liked = button.getAttribute("aria-pressed") === "true";
    button.setAttribute("aria-pressed", String(!liked));
    changeCount(button.querySelector(".post__count"), liked ? -1 : 1);
    // backend: send the like / unlike request here
  }

  function handleComment(button, post) {
    const section = post.querySelector(".post__comments");
    if (!section) return;
    const open = section.hidden; // hidden now means it is about to open
    section.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (open) {
      const input = section.querySelector(".post__comment-input");
      if (input) input.focus();
    }
  }

  function handleShare(button, post) {
    const menu = post.querySelector(".share-menu");
    if (!menu) return;
    const open = menu.hidden; // hidden now means it is about to open
    closeShareMenus(); // close any other open menu first
    menu.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  }

  if (feedList) {
    // Enhance posts already on the page, and any added later
    feedList.querySelectorAll(".post").forEach(enhancePost);

    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.matches(".post")) enhancePost(node);
          node.querySelectorAll(".post").forEach(enhancePost);
        });
      });
    }).observe(feedList, { childList: true, subtree: true });

    feedList.addEventListener("click", function (event) {
      const shareItem = event.target.closest(".share-menu__item");
      if (shareItem) {
        handleShareChoice(shareItem);
        return;
      }

      const button = event.target.closest(".post__action");
      if (!button || !feedList.contains(button)) return;
      const post = button.closest(".post");
      if (!post) return;
      enhancePost(post);

      switch (button.dataset.action) {
        case "like":
          handleLike(button);
          break;
        case "comment":
          handleComment(button, post);
          break;
        case "share":
          handleShare(button, post);
          break;
      }
    });

    // Comment form: front-end preview only (adds plain text, no author)
    feedList.addEventListener("submit", function (event) {
      const form = event.target.closest(".post__comment-form");
      if (!form) return;
      event.preventDefault();

      const post = form.closest(".post");
      const input = form.querySelector(".post__comment-input");
      const list = post && post.querySelector(".post__comment-list");
      const text = input ? input.value.trim() : "";
      if (!text || !list) return;

      list.appendChild(buildComment(text));
      input.value = "";
      changeCount(
        post.querySelector('[data-action="comment"] .post__count'),
        1,
      );
      // backend: send the comment here
    });

    // Close the Share menu on outside click or Escape
    document.addEventListener("click", function (event) {
      if (
        event.target.closest(".share-menu") ||
        event.target.closest('[data-action="share"]')
      )
        return;
      closeShareMenus();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeShareMenus();
    });
  }

  /* ---------- 4. PROFILE PANEL (circle button) ---------- */
  if (!profilePanel) return;

  function isPanelOpen() {
    return !profilePanel.hidden;
  }

  function setPanelOpen(open) {
    profilePanel.hidden = !open;
    profileToggle.setAttribute("aria-expanded", String(open));
    profileToggle.setAttribute(
      "aria-label",
      open ? "Close profile" : "Open profile",
    );
    if (!open) setSettingsOpen(false); // collapse Settings when the panel closes
  }

  profileToggle.addEventListener("click", function () {
    setPanelOpen(!isPanelOpen());
  });

  // Close when clicking outside the panel and its toggle
  document.addEventListener("click", function (event) {
    if (!isPanelOpen()) return;
    if (
      profilePanel.contains(event.target) ||
      profileToggle.contains(event.target)
    )
      return;
    setPanelOpen(false);
  });

  // Close with Escape and return focus to the toggle
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isPanelOpen()) {
      setPanelOpen(false);
      profileToggle.focus();
    }
  });
})();
