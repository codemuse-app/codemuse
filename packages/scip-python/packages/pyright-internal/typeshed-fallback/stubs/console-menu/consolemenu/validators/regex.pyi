from consolemenu.validators.base import BaseValidator as BaseValidator

class RegexValidator(BaseValidator):
    def __init__(self, pattern: str) -> None: ...
    @property
    def pattern(self) -> str: ...
    def validate(self, input_string: str) -> bool: ...