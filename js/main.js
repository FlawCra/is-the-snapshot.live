Sentry.init({
    dsn: "https://56f254157dc44100bcef759734ef6cbd@sentry.flawcra.cc/3",
    integrations: [
        new Sentry.BrowserTracing(),
        new Sentry.Replay(),
    ],
    beforeSend(event, hint) {
        // Check if it is an exception, and if so, show the report dialog
        if (event.exception) {
          Sentry.showReportDialog({ eventId: event.event_id });
        }
        return event;
      },
    tracesSampleRate: 0.5,
  });

    if(localStorage.getItem("enable-notifications") == "checked") {
        var el = $("[name=enable-notifications]")[0];
        if(Notification.permission !== "granted") {
            Notification.requestPermission();
            el.checked = false;
        } else {
            el.checked = true;
        }
    }

    if(localStorage.getItem("enable-sound") == "checked") {
        localStorage.setItem("enable-sound", "");
    }
    
    $("[name=enable-notifications]").change((el) => {
        if(Notification.permission !== "granted") {
            Notification.requestPermission();
            el.currentTarget.checked = false;
            return;
        }
        localStorage.setItem("enable-notifications",el.currentTarget.checked ? "checked" : "");
    });

    $("[name=enable-sound]").change((el) => {
        el.currentTarget.checked ? play_sound(sound_on) : play_sound(sound_off);
        localStorage.setItem("enable-sound",el.currentTarget.checked ? "checked" : "");
    });

    var url = "https://cors.flawcra.cc/?https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
    var live_sound = "/audio/snapshot_live.wav";
    var sound_on = "/audio/enable_sound.wav";
    var sound_off = "/audio/disable_sound.wav";
    var livetext = document.getElementById("livetext");
    var latest = document.getElementById("latest");
    var phoenix_stream = document.getElementById("phoenix_stream");
    var buttons = document.getElementById("buttons");
    var first_button = true;
    var buttons_shown = false;
    var latest_snapshot = "";
    var latest_snapshot_released = null;
    var not_live = `It's not live yet 😔`;
    var live_now = `It's live now! 🎉`;
    var loop;
    var first_run = async () => {
        var res = await fetch(url);
        var json = await res.json();
        latest_snapshot = json.latest.snapshot;
        loop = setInterval(async function () {
            var res = await fetch(url);
            var json = await res.json();
            if(FlawCraLIB.getParameterByName("snap", location.href)) {
                var snapshot = FlawCraLIB.getParameterByName("snap", location.href);
                if(await check(json, snapshot)) {
                    snapshot_event(true, snapshot);
                    clearInterval(loop);
                    return;
                } else {
                    snapshot_event(false, snapshot);
                    return;
                }
                
            }
    
            if(await check(json)) {
                latest_snapshot = json.latest.snapshot;
                snapshot_event(true, latest_snapshot);
                add_phoenix_stream();
                clearInterval(loop);
            } else {
                snapshot_event(false, json.latest.snapshot);
            }
        }, 1500);
    };
    first_run();

    var add_phoenix_stream = async () => {
        var phoenix_live = await is_phoenix_live();
        if(phoenix_live && (new Date() <= new Date(latest_snapshot_released.getFullYear(), latest_snapshot_released.getMonth(), latest_snapshot_released.getDate()+5))) {
            phoenix_stream.innerHTML = `Phoenix SC is currently live! He might be streaming the latest snapshot.<br>Check him out <a href="https://www.twitch.tv/phoenixsclive">here</a>.`;
        }
    }

    var play_sound = async (url, loud = false) => {
        var obj = new Audio(url);
        obj.volume = loud ? 0.25 : 0.05;
        obj.play().catch((e)=>{ });
    }

    var snapshot_event = async (live,snapshot_name) => {
        if(live) {
            livetext.innerText = live_now;
            latest.innerText = `Snapshot: ${snapshot_name}`;
            buttons_shown = false;
            await show_buttons(snapshot_name);
            
            live_audio();
            send_notification("Snapshot Live!", `The snapshot ${snapshot_name} is live!`);
        } else {
            livetext.innerText = not_live;
            latest.innerText = `Snapshot: ${snapshot_name}`;
            if(!buttons_shown) await show_buttons(snapshot_name);
        }
    }

    var show_buttons = async (snapshot_name) => {
        first_button = true;
        buttons.innerHTML = "";

        var snapshot_regex = /([0-9][0-9]w[0-9][0-9])[k_url\("(.*)"\)\) a-z]*/g;
        var pre_regex = /([0-9]\.[0-9][0-9](\.[0-9])?)-pre([0-9][0-9]?)/g;
        var rc_regex = /([0-9]\.[0-9][0-9](\.[0-9])?)-rc([0-9][0-9]?)/g;
        if(snapshot_regex.test(snapshot_name)) {
            var match = snapshot_regex.exec(snapshot_name);
            while(!match) match = snapshot_regex.exec(snapshot_name);
            check_url(`https://cors.flawcra.cc/?https://www.minecraft.net/en-us/article/minecraft-snapshot-${match[0]}`, () => {
                add_button("View on Minecraft.net", `https://www.minecraft.net/en-us/article/minecraft-snapshot-${match[0]}`);
            });
            check_url(`https://cors.flawcra.cc/?https://tis.codes/snapshots/${match[0]}`, () => {
                add_button("View on Tis", `https://tis.codes/snapshots/${match[0]}`);
            });
        } else if(pre_regex.test(snapshot_name)) {
            var match = pre_regex.exec(snapshot_name);
            while(!match) match = pre_regex.exec(snapshot_name);
            check_url(`https://cors.flawcra.cc/?https://www.minecraft.net/en-us/article/minecraft-${match[1].replaceAll(".","-")}-pre-release-${match[3]}`, () => {
                add_button("View on Minecraft.net", `https://www.minecraft.net/en-us/article/minecraft-${match[1].replaceAll(".","-")}-pre-release-${match[3]}`);
            });
            check_url(`https://cors.flawcra.cc/?https://tis.codes/snapshots/${match[1].replaceAll(".","-")}-pre${match[3]}`, () => {
                add_button("View on Tis", `https://tis.codes/snapshots/${match[1].replaceAll(".","-")}-pre${match[3]}`);
            });
        } else if(rc_regex.test(snapshot_name)) {
            var match = rc_regex.exec(snapshot_name);
            while(!match) match = rc_regex.exec(snapshot_name);
            check_url(`https://cors.flawcra.cc/?https://www.minecraft.net/en-us/article/minecraft-${match[1].replaceAll(".","-")}-release-candidate-${match[3]}`, () => {
                add_button("View on Minecraft.net", `https://www.minecraft.net/en-us/article/minecraft-${match[1].replaceAll(".","-")}-release-candidate-${match[3]}`);
            });
            check_url(`https://cors.flawcra.cc/?https://tis.codes/snapshots/${match[1].replaceAll(".","-")}-rc${match[3]}`, () => {
                add_button("View on Tis", `https://tis.codes/snapshots/${match[1].replaceAll(".","-")}-rc${match[3]}`);
            });
        }
        
    
        buttons_shown = true;
    }

    var live_audio = () => {
        if(!localStorage.getItem("enable-sound") || localStorage.getItem("enable-sound") != "checked") return;
        play_sound(live_sound, true);
    }

    var add_button = (text, link) => {
        if(!first_button) buttons.innerHTML += "<br>";
        first_button = false;
        buttons.innerHTML += `<a class="mc-button__primary mc-button__green-s1" href="${link}" aria-label="${text}" data-aem-contentname="${text}" target="_blank">${text}</a>`
    }

    var send_notification = (title, body) => {
        if(!localStorage.getItem("enable-notifications") || localStorage.getItem("enable-notifications") != "checked") return;
        if(!("Notification" in window)) return;
        if(Notification.permission === "granted") {
            new Notification(title, {
                body: body,
				badge: "https://is-the-snapshot.live/images/icons/logo.png",
				icon: "https://is-the-snapshot.live/images/icons/logo.png",
				image: "https://is-the-snapshot.live/images/icons/logo.png",
                vibrate: [200, 100, 200],
            });
        }
    }

    var check = (data, snapshot_override = null) => {
        for(var _ of data.versions) {
            if(_.id == snapshot_override) {
                var bool = new Date() > new Date(_.releaseTime);
                return bool;
            }
            if(snapshot_override) continue;
            if(_.id == data.latest.snapshot) {
                var release = new Date(_.releaseTime);
                latest_snapshot_released = release;
                var bool = (new Date() > new Date(_.releaseTime)) && (new Date() < new Date(release.getFullYear(), release.getMonth(), release.getDate()+5));
                return bool;
            }
        }
        return false;
    }

    var check_url = async (url, on_success = null) => {
        var request = await fetch(url);
        if(on_success && request.status == 200) on_success();
        return (request.status == 200) ? true : false;
    }

    var is_phoenix_live = async () => {
        let a = await fetch(`https://cors.flawcra.cc/?https://www.twitch.tv/phoenixsclive`);
        return (await a.text()).includes('isLiveBroadcast');
    }
