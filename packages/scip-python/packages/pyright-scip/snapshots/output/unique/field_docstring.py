# < definition scip-python python snapshot-util 0.1 field_docstring/__init__:
#documentation (module) field_docstring

class ClassWithField:
#     ^^^^^^^^^^^^^^ definition  snapshot-util 0.1 field_docstring/ClassWithField#
#     documentation ```python
#                 > class ClassWithField:
#                 > ```

    a: int
#   ^ definition  snapshot-util 0.1 field_docstring/ClassWithField#a.
#   documentation ```python
#               > (variable) a: int
#               > ```
#   documentation ---
#               > 
#   documentation Hello world, this is a
#      ^^^ reference  python-stdlib 3.11 builtins/int#
#      external documentation ```python
#                  > (class) int
#                  > ```
    """Hello world, this is a"""

