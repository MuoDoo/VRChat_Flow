from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    dashscope_api_key: str = ""
    jwt_secret: str = ""
    database_path: str = "./vrcflow.db"
    max_user_daily_seconds: int = 7200
    max_audio_duration: int = 30
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    port: int = 8080
    admin_init_password: str = ""

    model_config = {"env_file": ".env"}


settings = Settings()
