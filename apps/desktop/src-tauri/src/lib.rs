use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

const NOTIFICATION_ACTION_EVENT: &str = "timeaura://notification-action";

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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NotificationActionEventPayload {
  notification_id: String,
  action_id: String,
  extra: serde_json::Value,
}

#[tauri::command]
fn show_actionable_notification(
  app: AppHandle,
  input: ActionableNotificationInput,
) -> Result<(), String> {
  #[cfg(target_os = "macos")]
  {
    use mac_notification_sys::{MainButton, Notification, NotificationResponse};

    let bundle_identifier = if tauri::is_dev() {
      String::from("com.apple.Terminal")
    } else {
      app.config().identifier.clone()
    };

    let ActionableNotificationInput {
      id,
      title,
      body,
      actions,
      extra,
    } = input;

    let app_handle = app.clone();

    std::thread::spawn(move || {
      let _ = mac_notification_sys::set_application(&bundle_identifier);

      let action_labels = actions
        .iter()
        .map(|action| action.label.clone())
        .collect::<Vec<_>>();
      let action_label_refs = action_labels.iter().map(String::as_str).collect::<Vec<_>>();

      let mut notification = Notification::new();
      notification
        .title(&title)
        .message(&body)
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

      let response = notification.send();

      let action_id = match response {
        Ok(NotificationResponse::Click) => Some(String::from("open_detail")),
        Ok(NotificationResponse::ActionButton(label)) => actions
          .iter()
          .find(|action| action.label == label)
          .map(|action| action.id.clone()),
        Ok(NotificationResponse::Reply(_)) => None,
        Ok(NotificationResponse::CloseButton(_)) => None,
        Ok(NotificationResponse::None) => None,
        Err(_) => None,
      };

      if let Some(action_id) = action_id {
        let payload = NotificationActionEventPayload {
          notification_id: id,
          action_id,
          extra,
        };

        let _ = app_handle.emit(NOTIFICATION_ACTION_EVENT, payload);
      }
    });

    Ok(())
  }

  #[cfg(not(target_os = "macos"))]
  {
    let _ = app;
    let _ = input;
    Ok(())
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![show_actionable_notification])
    .setup(|app| {
      let salt_path = app
        .path()
        .app_local_data_dir()
        .expect("could not resolve app local data path")
        .join("stronghold-salt.txt");

      app
        .handle()
        .plugin(tauri_plugin_stronghold::Builder::with_argon2(&salt_path).build())?;
      Ok(())
    })
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .run(tauri::generate_context!())
    .expect("error while running TimeAura desktop");
}
