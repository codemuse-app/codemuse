# < definition scip-python python snapshot-util 0.1 inferred_field_docstring/__init__:
#documentation (module) inferred_field_docstring

# format-options: showDocs

class ClassWithInferredField:
#     ^^^^^^^^^^^^^^^^^^^^^^ definition  snapshot-util 0.1 inferred_field_docstring/ClassWithInferredField#
#     documentation ```python
#                 > class ClassWithInferredField:
#                 > ```
    def __init__(self, b: int):
#       ^^^^^^^^ definition  snapshot-util 0.1 inferred_field_docstring/ClassWithInferredField#__init__().
#       documentation ```python
#                   > def __init__(
#                   >   self,
#                   >   b: int
#                   > ) -> None:
#                   > ```
#                ^^^^ definition  snapshot-util 0.1 inferred_field_docstring/ClassWithInferredField#__init__().(self)
#                      ^ definition  snapshot-util 0.1 inferred_field_docstring/ClassWithInferredField#__init__().(b)
#                         ^^^ reference  python-stdlib 3.11 builtins/int#
#                         external documentation ```python
#                                     > (class) int
#                                     > ```
        self.b = b
#       ^^^^ reference  snapshot-util 0.1 inferred_field_docstring/ClassWithInferredField#__init__().(self)
#            ^ definition  snapshot-util 0.1 inferred_field_docstring/ClassWithInferredField#b.
#            documentation ```python
#                        > (variable) b: int
#                        > ```
#                ^ reference  snapshot-util 0.1 inferred_field_docstring/ClassWithInferredField#__init__().(b)

