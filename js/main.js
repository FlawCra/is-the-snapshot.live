
(async function ($) {
    "use strict";

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
        if(Notification.permission !== "granted") {
            Notification.requestPermission();
            el.currentTarget.checked = false;
            return;
        }
        localStorage.setItem("enable-sound",el.currentTarget.checked ? "checked" : "");
    });

    var url = "https://launchermeta.mojang.com/mc/game/version_manifest.json";
    var live_sound = "https://cdn.flawcra.cc/12/DATA/60ac5f5dae9a5c2b877cdd58988a1e32e5b5a0445a54210937fa28fa66c946f0c4591e5b0181f4d97410814d3f048cd11b15a512ae6d6dce5fa38035e3432b61/689394792700025409/snapshot_live.wav";
    var live_sound_obj = new Audio(live_sound);
    var livetext = document.getElementById("livetext");
    var latest = document.getElementById("latest");
    var phoenix_stream = document.getElementById("phoenix_stream");
    var buttons = document.getElementById("buttons");
    var first_button = true;
    var latest_snapshot = "";
    var latest_snapshot_released = null;
    var not_live = `It's not live yet 😔`;
    var live_now = `It's live now! 🎉`;
    
    var res = await fetch(url);
    var json = await res.json();
    latest_snapshot = json.latest.snapshot;
    
    var loop = setInterval(async function () {
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

    var add_phoenix_stream = async () => {
        var phoenix_live = await is_phoenix_live();
        if(phoenix_live && (new Date() <= new Date(latest_snapshot_released.getFullYear(), latest_snapshot_released.getMonth(), latest_snapshot_released.getDate()+5))) {
            phoenix_stream.innerHTML = `Phoenix SC is currently live! He might be streaming the latest snapshot.<br>Check him out <a href="https://www.twitch.tv/phoenixsclive">here</a>.`;
        }
    }

    var snapshot_event = async (live,snapshot_name) => {
        if(live) {
            livetext.innerText = live_now;
            latest.innerText = `Snapshot: ${snapshot_name}`;
            show_buttons(snapshot_name);
            
            play_audio();
            send_notification("Snapshot Live!", `The snapshot ${snapshot_name} is live!`);
        } else {
            livetext.innerText = not_live;
            latest.innerText = `Snapshot: ${snapshot_name}`;
            show_buttons(snapshot_name);
        }
    }

    var show_buttons = (snapshot_name) => {
        var regex = /([0-9][0-9]w[0-9][0-9])[a-z]/g
        var match = regex.exec(snapshot_name);
        if(await check_url("https://cors.flawcra.cc/?https://www.minecraft.net/en-us/article/minecraft-snapshot-"+match[1]+"a")) add_button("View on Minecraft.net", "https://www.minecraft.net/en-us/article/minecraft-snapshot-"+match[1]+"a");
        if(await check_url("https://cors.flawcra.cc/?https://tisawesomeness.github.io/snapshots/"+match[1]+"a")) add_button("View on Tis", "https://tisawesomeness.github.io/snapshots/"+match[1]+"a");
    }

    var play_audio = async () => {
        if(!localStorage.getItem("enable-sound") || localStorage.getItem("enable-sound") != "checked") return;
        live_sound_obj.play();
    }

    var add_button = async (text, link) => {
        if(!first_button) buttons.innerHTML += "<br>";
        first_button = false;
        buttons.innerHTML += `<a class="mc-button__primary mc-button__green-s1" href="${link}" aria-label="${text}" data-aem-contentname="${text}" target="_blank">${text}</a>`
    }

    var send_notification = async (title, body) => {
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

    var check = async (data, snapshot_override = null) => {
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

    var check_url = async (url) => {
        var request = await fetch(url);
        return (request.status == 200) ? true : false;
    }

    var is_phoenix_live = async () => {
        let a = await fetch(`https://cors.flawcra.cc/?https://www.twitch.tv/phoenixsclive`);
        return (await a.text()).includes('isLiveBroadcast');
    }

})(jQuery);