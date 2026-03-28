use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, RunEvent, Runtime, WindowEvent};

const NOTIFICATION_ACTION_EVENT: &str = "timeaura://notification-action";
const MAIN_WINDOW_LABEL: &str = "main";
const TRAY_OPEN_ID: &str = "tray_open";
const TRAY_QUIT_ID: &str = "tray_quit";

#[derive(Default)]
struct ExitGate {
    allow_exit: AtomicBool,
}

impl ExitGate {
    fn allow(&self) {
        self.allow_exit.store(true, Ordering::SeqCst);
    }

    fn is_allowed(&self) -> bool {
        self.allow_exit.load(Ordering::SeqCst)
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ActionableNotificationAction {
    id: String,
    label: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ActionableNotificationInput {
    id: String,
    title: String,
    body: String,
    #[serde(default)]
    actions: Vec<ActionableNotificationAction>,
    #[serde(default)]
    extra: serde_json::Value,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct NotificationActionEventPayload {
    notification_id: String,
    action_id: String,
    extra: serde_json::Value,
}

#[tauri::command]
fn show_actionable_notification<R: Runtime>(
    app: AppHandle<R>,
    input: ActionableNotificationInput,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        show_actionable_notification_macos(app, input)
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        let _ = input;
        Ok(())
    }
}

#[cfg(target_os = "macos")]
fn show_actionable_notification_macos<R: Runtime>(
    app: AppHandle<R>,
    input: ActionableNotificationInput,
) -> Result<(), String> {
    #[cfg(test)]
    if let Some(action_id) = test_action_id_override(&input) {
        return emit_notification_action(&app, &input, action_id);
    }

    let bundle_identifier = resolve_notification_bundle_identifier(&app);
    let app_handle = app.clone();

    std::thread::spawn(move || {
        let action_id = show_macos_notification(&bundle_identifier, &input);

        if let Some(action_id) = action_id {
            let _ = emit_notification_action(&app_handle, &input, action_id);
        }
    });

    Ok(())
}

#[cfg(target_os = "macos")]
fn show_macos_notification(
    bundle_identifier: &str,
    input: &ActionableNotificationInput,
) -> Option<String> {
    use mac_notification_sys::{MainButton, Notification, NotificationResponse};

    let _ = mac_notification_sys::set_application(bundle_identifier);

    let action_labels = input
        .actions
        .iter()
        .map(|action| action.label.clone())
        .collect::<Vec<_>>();
    let action_label_refs = action_labels.iter().map(String::as_str).collect::<Vec<_>>();

    let mut notification = Notification::new();
    notification
        .title(&input.title)
        .message(&input.body)
        .wait_for_click(true)
        .close_button("关闭");

    match action_label_refs.as_slice() {
        [] => {}
        [single_action] => {
            notification.main_button(MainButton::SingleAction(single_action));
        }
        multiple_actions => {
            notification.main_button(MainButton::DropdownActions("操作", multiple_actions));
        }
    }

    match notification.send() {
        Ok(NotificationResponse::Click) => Some(String::from("open_detail")),
        Ok(NotificationResponse::ActionButton(label)) => {
            resolve_action_id_from_label(&input.actions, &label)
        }
        Ok(NotificationResponse::Reply(_)) => None,
        Ok(NotificationResponse::CloseButton(_)) => None,
        Ok(NotificationResponse::None) => None,
        Err(_) => None,
    }
}

#[cfg(target_os = "macos")]
fn resolve_notification_bundle_identifier<R: Runtime>(app: &AppHandle<R>) -> String {
    if tauri::is_dev() {
        String::from("com.apple.Terminal")
    } else {
        app.config().identifier.clone()
    }
}

fn resolve_action_id_from_label(
    actions: &[ActionableNotificationAction],
    clicked_label: &str,
) -> Option<String> {
    actions
        .iter()
        .find(|action| action.label == clicked_label)
        .map(|action| action.id.clone())
}

fn create_notification_action_payload(
    input: &ActionableNotificationInput,
    action_id: String,
) -> NotificationActionEventPayload {
    NotificationActionEventPayload {
        notification_id: input.id.clone(),
        action_id,
        extra: input.extra.clone(),
    }
}

fn emit_notification_action<R: Runtime>(
    app: &AppHandle<R>,
    input: &ActionableNotificationInput,
    action_id: String,
) -> Result<(), String> {
    app.emit(
        NOTIFICATION_ACTION_EVENT,
        create_notification_action_payload(input, action_id),
    )
    .map_err(|error| format!("failed to emit notification action event: {error}"))
}

#[cfg(all(test, target_os = "macos"))]
fn test_action_id_override(input: &ActionableNotificationInput) -> Option<String> {
    input
        .extra
        .get("__testActionId")
        .and_then(|value| value.as_str())
        .map(str::to_string)
}

fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn hide_main_window<R: Runtime>(app: &AppHandle<R>) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.hide();
    }
}

fn setup_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let open_item = MenuItem::with_id(app, TRAY_OPEN_ID, "打开 TimeAura", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, TRAY_QUIT_ID, "退出 TimeAura", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(app, &[&open_item, &separator, &quit_item])?;

    let mut tray = TrayIconBuilder::with_id("timeaura-menubar")
        .menu(&menu)
        .tooltip("TimeAura")
        .show_menu_on_left_click(false)
        .icon_as_template(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            TRAY_OPEN_ID => show_main_window(app),
            TRAY_QUIT_ID => {
                app.state::<ExitGate>().allow();
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if matches!(
                event,
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                }
            ) {
                show_main_window(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        tray = tray.icon(icon);
    }

    tray.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(ExitGate::default())
        .invoke_handler(tauri::generate_handler![show_actionable_notification])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .setup(|app| {
            let salt_path = app
                .path()
                .app_local_data_dir()
                .expect("could not resolve app local data path")
                .join("stronghold-salt.txt");

            app.handle()
                .plugin(tauri_plugin_stronghold::Builder::with_argon2(&salt_path).build())?;
            setup_tray(&app.handle())?;
            Ok(())
        })
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .build(tauri::generate_context!())
        .expect("error while building TimeAura desktop");

    app.run(|app_handle, event| match event {
        RunEvent::ExitRequested { api, .. } => {
            if !app_handle.state::<ExitGate>().is_allowed() {
                api.prevent_exit();
                hide_main_window(app_handle);
            }
        }
        #[cfg(target_os = "macos")]
        RunEvent::Reopen {
            has_visible_windows: false,
            ..
        } => show_main_window(app_handle),
        _ => {}
    });
}

#[cfg(test)]
mod tests {
    use std::sync::mpsc::sync_channel;
    use std::time::Duration;

    use serde_json::json;
    use tauri::ipc::{CallbackFn, InvokeBody};
    use tauri::test::{get_ipc_response, mock_builder, mock_context, noop_assets, INVOKE_KEY};
    use tauri::webview::InvokeRequest;
    use tauri::{Listener, WebviewWindowBuilder};

    use super::{
        create_notification_action_payload, resolve_action_id_from_label,
        ActionableNotificationAction, NotificationActionEventPayload, NOTIFICATION_ACTION_EVENT,
    };

    #[test]
    fn resolves_notification_action_by_label() {
        let actions = vec![
            ActionableNotificationAction {
                id: String::from("complete"),
                label: String::from("完成"),
            },
            ActionableNotificationAction {
                id: String::from("later"),
                label: String::from("稍后提醒"),
            },
        ];

        assert_eq!(
            resolve_action_id_from_label(&actions, "稍后提醒"),
            Some(String::from("later"))
        );
        assert_eq!(resolve_action_id_from_label(&actions, "不存在"), None);
    }

    #[test]
    fn builds_notification_action_payload() {
        let payload = create_notification_action_payload(
            &super::ActionableNotificationInput {
                id: String::from("notification-1"),
                title: String::from("提醒"),
                body: String::from("处理积压任务"),
                actions: Vec::new(),
                extra: json!({
                  "recordId": "record-1",
                }),
            },
            String::from("open_detail"),
        );

        assert_eq!(
            serde_json::to_value(payload).unwrap(),
            json!({
              "notificationId": "notification-1",
              "actionId": "open_detail",
              "extra": {
                "recordId": "record-1",
              }
            })
        );
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn actionable_notification_command_emits_app_event_in_test_mode() {
        let app = mock_builder()
            .invoke_handler(tauri::generate_handler![
                super::show_actionable_notification
            ])
            .build(mock_context(noop_assets()))
            .expect("failed to build test app");
        let webview = WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .expect("failed to build test webview");
        let (sender, receiver) = sync_channel(1);

        let listener = app.listen(NOTIFICATION_ACTION_EVENT, move |event: tauri::Event| {
            sender.send(event.payload().to_string()).unwrap();
        });

        let response = get_ipc_response(
            &webview,
            InvokeRequest {
                cmd: "show_actionable_notification".into(),
                callback: CallbackFn(0),
                error: CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: InvokeBody::Json(json!({
                  "input": {
                    "id": "notification-1",
                    "title": "提醒",
                    "body": "处理积压任务",
                    "actions": [
                      {
                        "id": "snooze",
                        "label": "稍后提醒"
                      }
                    ],
                    "extra": {
                      "recordId": "record-1",
                      "__testActionId": "snooze"
                    }
                  }
                })),
                headers: Default::default(),
                invoke_key: INVOKE_KEY.to_string(),
            },
        );

        assert!(response.is_ok());

        let payload = receiver
            .recv_timeout(Duration::from_millis(200))
            .expect("expected notification action event");
        let event: NotificationActionEventPayload = serde_json::from_str(&payload).unwrap();

        assert_eq!(event.notification_id, "notification-1");
        assert_eq!(event.action_id, "snooze");
        assert_eq!(event.extra["recordId"], "record-1");

        app.unlisten(listener);
    }
}
