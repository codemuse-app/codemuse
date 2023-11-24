# < definition scip-python python snapshot-util 0.1 class_nohint/__init__:
#documentation (module) class_nohint

class Example:
#     ^^^^^^^ definition  snapshot-util 0.1 class_nohint/Example#
#     documentation ```python
#                 > class Example:
#                 > ```
    # Note, only y has a type hint
    y: int
#   ^ definition  snapshot-util 0.1 class_nohint/Example#y.
#   documentation ```python
#               > (variable) y: int
#               > ```
#      ^^^ reference  python-stdlib 3.11 builtins/int#
#      external documentation ```python
#                  > (class) int
#                  > ```

    def __init__(self, in_val):
#       ^^^^^^^^ definition  snapshot-util 0.1 class_nohint/Example#__init__().
#       documentation ```python
#                   > def __init__(
#                   >   self,
#                   >   in_val
#                   > ) -> None:
#                   > ```
#                ^^^^ definition  snapshot-util 0.1 class_nohint/Example#__init__().(self)
#                      ^^^^^^ definition  snapshot-util 0.1 class_nohint/Example#__init__().(in_val)
        self.x = in_val
#       ^^^^ reference  snapshot-util 0.1 class_nohint/Example#__init__().(self)
#            ^ definition  snapshot-util 0.1 class_nohint/Example#x.
#            documentation ```python
#                        > (variable) x: Unknown
#                        > ```
#                ^^^^^^ reference  snapshot-util 0.1 class_nohint/Example#__init__().(in_val)
        self.x = self.x + 1
#       ^^^^ reference  snapshot-util 0.1 class_nohint/Example#__init__().(self)
#            ^ reference  snapshot-util 0.1 class_nohint/Example#x.
#                ^^^^ reference  snapshot-util 0.1 class_nohint/Example#__init__().(self)
#                     ^ reference  snapshot-util 0.1 class_nohint/Example#x.
        self.y = in_val
#       ^^^^ reference  snapshot-util 0.1 class_nohint/Example#__init__().(self)
#            ^ reference  snapshot-util 0.1 class_nohint/Example#y.
#                ^^^^^^ reference  snapshot-util 0.1 class_nohint/Example#__init__().(in_val)

    def something(self):
#       ^^^^^^^^^ definition  snapshot-util 0.1 class_nohint/Example#something().
#       documentation ```python
#                   > def something(
#                   >   self
#                   > ): # -> None:
#                   > ```
#                 ^^^^ definition  snapshot-util 0.1 class_nohint/Example#something().(self)
        print(self.x)
#       ^^^^^ reference  python-stdlib 3.11 builtins/print().
#       external documentation ```python
#                   > (function) def print(
#                   >     *values: object,
#                   >     sep: str | None = " ",
#                   >     end: str | None = "\n",
#                   >     file: SupportsWrite[str] | None = No...
#                   >     flush: Literal[False] = False
#                   > ) -> None
#                   > ```
#             ^^^^ reference  snapshot-util 0.1 class_nohint/Example#something().(self)
#                  ^ reference  snapshot-util 0.1 class_nohint/Example#x.
        print(self.y)
#       ^^^^^ reference  python-stdlib 3.11 builtins/print().
#             ^^^^ reference  snapshot-util 0.1 class_nohint/Example#something().(self)
#                  ^ reference  snapshot-util 0.1 class_nohint/Example#y.

